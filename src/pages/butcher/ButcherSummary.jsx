// src/pages/butcher/ButcherSummary.jsx
//
// 🗓️ التقرير الشامل للتقطيع — وثيقة رسمية قابلة للطباعة (EN/AR).
// SUMMARY REPORT OF ALL CUTTINGS FROM ALL TRANSACTIONS BY DATE.
//
// الأقسام: ترويسة رسمية · مؤشّرات مع مقارنة الفترة السابقة · اتجاه التصافي ·
//          حسب التاريخ · المنتجات مقابل أهداف الوصفات · حسب الفئة والوصفة ·
//          حسب الملحمة · أداء الجزارين (متوسط وثبات) · الانحرافات وجودة
//          البيانات · التواقيع.
//
// المصدر: GET /api/reports?type=butcher_cut_log عبر عُدّة التقارير المشتركة.

import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BRANCHES, nameOf } from "./butcherOptions";
import { BarChart, LineChart } from "./ButcherCharts";
import { useSettingsLang, LangToggle } from "../settings/_shared/settingsI18n";
import { canOpenButcherPage, NoAccess } from "./ButcherAccess";
import {
  C, Card, Chip, DeltaCell, EmptyBox, KIT_CSS, Kpi, MiniBar, PageHead, S,
  Skeleton, kg, monthStart, pct, shiftDays, todayStr, totalsOf, useButcherData,
  useNormalizedRows,
} from "./butcherReportKit";

const addDays = (iso, n) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const daysBetween = (a, b) =>
  Math.round((new Date(`${b}T00:00:00Z`) - new Date(`${a}T00:00:00Z`)) / 86400000) + 1;

/** انحراف معياري (عيّنة) — يقيس ثبات أداء الجزار. */
function stdev(values) {
  if (values.length < 2) return 0;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const varc = values.reduce((s, v) => s + (v - mean) ** 2, 0) / (values.length - 1);
  return Math.sqrt(varc);
}

const deltaPct = (now, before) =>
  before > 0 ? ((now - before) / before) * 100 : null;

export default function ButcherSummary() {
  const navigate = useNavigate();
  const { t, isAr, dir, lang, toggle } = useSettingsLang();
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(todayStr());

  /* التقرير يقارن بالفترة السابقة المكافئة، فنطلب من السيرفر ضِعف المدى
     ابتداءً من بداية الفترة السابقة — وإلا ما وصلتنا بيانات المقارنة. */
  const fetchFrom = useMemo(() => {
    if (!from || !to) return from;
    const span = daysBetween(from, to);
    return addDays(from, -span);
  }, [from, to]);

  const { records, loading, error, truncated, reload, cfg, mrpCfg } =
    useButcherData({ from: fetchFrom, to });
  const all = useNormalizedRows(records, { cfg, mrpCfg, isAr });
  const [branch, setBranch] = useState("");

  const inRange = (r, a, b) =>
    (!a || r.day >= a) && (!b || r.day <= b) && (!branch || r.branchCode === branch);

  /* الفترة الحالية والفترة السابقة المكافئة (للمقارنة) */
  const rows = useMemo(() => all.filter((r) => inRange(r, from, to)), [all, from, to, branch]);

  const prevRows = useMemo(() => {
    if (!from || !to) return [];
    const span = daysBetween(from, to);
    const pTo = addDays(from, -1);
    const pFrom = addDays(pTo, -(span - 1));
    return all.filter((r) => inRange(r, pFrom, pTo));
  }, [all, from, to, branch]);

  const stats = useMemo(() => totalsOf(rows), [rows]);
  const prev = useMemo(() => totalsOf(prevRows), [prevRows]);

  /* ── حسب التاريخ ── */
  const byDate = useMemo(() => {
    const map = new Map();
    rows.forEach((r) => {
      if (!map.has(r.day)) map.set(r.day, []);
      map.get(r.day).push(r);
    });
    return [...map.entries()]
      .map(([day, list]) => ({ day, ...totalsOf(list) }))
      .sort((a, b) => a.day.localeCompare(b.day));
  }, [rows]);

  /* ── المنتجات مقابل أهداف الوصفات ── */
  const products = useMemo(() => {
    const map = new Map();
    rows.forEach((r) => {
      r.cuts.forEach((c) => {
        const k = c.itemId || c.name;
        if (!map.has(k)) {
          map.set(k, {
            name: c.name, nameAlt: c.nameAlt, sku: c.sku, isWaste: c.isWaste,
            actual: 0, target: 0, n: 0,
          });
        }
        const g = map.get(k);
        g.actual += c.weightKg;
        g.target += c.targetKg;
        g.n += 1;
      });
    });
    return [...map.values()]
      .map((g) => ({
        ...g,
        share: pct(g.actual, stats.baseKg),
        deviation: g.target > 0 ? ((g.actual - g.target) / g.target) * 100 : null,
      }))
      .sort((a, b) => b.actual - a.actual);
  }, [rows, stats.baseKg]);

  /* ── تجميع عام قابل لإعادة الاستعمال ── */
  const groupBy = (key) => {
    const map = new Map();
    rows.forEach((r) => {
      const k = r[key] || "—";
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(r);
    });
    return [...map.entries()]
      .map(([k, list]) => ({ key: k, ...totalsOf(list) }))
      .sort((a, b) => b.carcassKg - a.carcassKg);
  };

  const byCategory = useMemo(() => groupBy("bomCatName"), [rows]);
  const byRecipe = useMemo(() => groupBy("bomRef"), [rows]);
  const byBranch = useMemo(() => groupBy("branchName"), [rows]);

  /* ── أداء الجزارين: متوسط التصافي + الثبات ── */
  const byButcher = useMemo(() => {
    const map = new Map();
    rows.forEach((r) => {
      if (!map.has(r.employeeNo)) map.set(r.employeeNo, []);
      map.get(r.employeeNo).push(r);
    });
    return [...map.entries()]
      .map(([name, list]) => {
        const yields = list.map((r) => r.yieldPct).filter((v) => v > 0);
        const sd = stdev(yields);
        return {
          name, ...totalsOf(list),
          sd,
          // ثبات: كل ما قلّ الانحراف المعياري كان الأداء أثبت
          steady: sd <= 2 ? "high" : sd <= 5 ? "mid" : "low",
        };
      })
      .sort((a, b) => b.yieldPct - a.yieldPct);
  }, [rows]);

  /* ── الانحرافات وجودة البيانات ── */
  const issues = useMemo(() => {
    const out = [];
    rows.forEach((r) => {
      if (r.unaccountedKg > 0.005) {
        out.push({
          day: r.day, who: r.employeeNo, ref: r.bomRef,
          kind: t({ en: "Unaccounted weight", ar: "فاقد غير مسجّل" }),
          detail: `${kg(r.unaccountedKg)} kg`,
          tone: "amber",
        });
      }
      if (r.carcassKg <= 0) {
        out.push({
          day: r.day, who: r.employeeNo, ref: r.bomRef,
          kind: t({ en: "Missing raw weight", ar: "وزن الخام مفقود" }),
          detail: "—", tone: "red",
        });
      }
      r.cuts.forEach((c) => {
        if (c.deltaPct !== null && Math.abs(c.deltaPct) > 15) {
          out.push({
            day: r.day, who: r.employeeNo, ref: r.bomRef,
            kind: t({ en: "Off target", ar: "بعيد عن الهدف" }),
            detail: `${c.name}: ${c.deltaPct > 0 ? "+" : ""}${c.deltaPct.toFixed(1)}%`,
            tone: "red",
          });
        }
      });
      if (r.reviewStatus === "rejected") {
        out.push({
          day: r.day, who: r.employeeNo, ref: r.bomRef,
          kind: t({ en: "Rejected", ar: "مرفوض" }),
          detail: r.review?.reason || "—", tone: "red",
        });
      }
    });
    return out.sort((a, b) => b.day.localeCompare(a.day));
  }, [rows, t]);

  /* بيانات الرسوم */
  const yieldSeries = useMemo(
    () => byDate.map((d) => ({ label: d.day.slice(5), value: d.yieldPct })),
    [byDate]
  );
  const volumeSeries = useMemo(
    () => byDate.map((d) => ({ label: d.day.slice(5), value: d.carcassKg })),
    [byDate]
  );
  /* أعمدة أفقية — أعلى ٨ وصفات فقط حتى يبقى الرسم مقروءاً */
  const topRecipes = useMemo(
    () => byRecipe.slice(0, 8).map((g) => ({ label: g.key, value: g.carcassKg })),
    [byRecipe]
  );

  const REP = cfg.report || {};
  const printedAt = new Date().toLocaleString("en-GB", {
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
  });

  if (!canOpenButcherPage("butcher.summary")) return <NoAccess page="butcher.summary" />;

  return (
    <div dir={dir} className="bk bk-page" style={S.page}>
      <style>{KIT_CSS}</style>
      <div style={S.wrap}>
        <PageHead
          icon="🗓️"
          title={t({ en: "Full Summary Report", ar: "التقرير الشامل" })}
          sub={t({
            en: "All cutting transactions by date, with recipe-target analysis.",
            ar: "كل معاملات التقطيع حسب التاريخ، مع تحليل مقابل أهداف الوصفات.",
          })}
        >
          <LangToggle lang={lang} toggle={toggle} style={{ ...S.btn, ...S.btnSm }} />
          <button type="button" style={{ ...S.btn, ...S.btnSm }} onClick={reload}>
            ↻ {t({ en: "Refresh", ar: "تحديث" })}
          </button>
          <button
            type="button"
            style={{ ...S.btn, ...S.btnSm, ...S.btnPrimary }}
            onClick={() => window.print()}
          >
            🖨 {t({ en: "Print / PDF", ar: "طباعة / PDF" })}
          </button>
          <button type="button" style={{ ...S.btn, ...S.btnSm }} onClick={() => navigate("/butcher")}>
            ← {t({ en: "Back", ar: "رجوع" })}
          </button>
        </PageHead>

        {/* ══ اختيار الفترة ══ */}
        <Card
          icon="📅"
          title={t({ en: "Report period", ar: "فترة التقرير" })}
          style={{ marginBottom: 16 }}
        >
          <div className="bk-noprint bk-tools" style={S.toolbar}>
            <label style={S.label}>
              <span className="bk-lbl" style={{ color: C.muted }}>{t({ en: "From", ar: "من" })}</span>
              <input type="date" value={from} max={to || undefined}
                onChange={(e) => setFrom(e.target.value)} style={S.input} />
            </label>
            <label style={S.label}>
              <span className="bk-lbl" style={{ color: C.muted }}>{t({ en: "To", ar: "إلى" })}</span>
              <input type="date" value={to} min={from || undefined}
                onChange={(e) => setTo(e.target.value)} style={S.input} />
            </label>
            <label style={S.label}>
              <span className="bk-lbl" style={{ color: C.muted }}>{t({ en: "Butchery", ar: "الملحمة" })}</span>
              <select value={branch} onChange={(e) => setBranch(e.target.value)} style={S.input}>
                <option value="">{t({ en: "All butcheries", ar: "كل الملاحم" })}</option>
                {BRANCHES.map((b) => (
                  <option key={b.code} value={b.code}>{nameOf(b, isAr)}</option>
                ))}
              </select>
            </label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "end" }}>
              {[
                { lbl: t({ en: "This month", ar: "هذا الشهر" }), a: monthStart(), b: todayStr() },
                { lbl: t({ en: "30 days", ar: "٣٠ يوم" }), a: shiftDays(-29), b: todayStr() },
                { lbl: t({ en: "90 days", ar: "٩٠ يوم" }), a: shiftDays(-89), b: todayStr() },
              ].map((p) => (
                <button key={p.lbl} type="button"
                  style={{ ...S.btn, ...S.btnSm, ...(from === p.a && to === p.b ? S.btnPrimary : null) }}
                  onClick={() => { setFrom(p.a); setTo(p.b); }}
                >
                  {p.lbl}
                </button>
              ))}
            </div>
          </div>
        </Card>

        {error && (
          <div style={{ ...S.card, background: "#fff5f5", borderColor: "#f3c9c9", color: C.red, fontWeight: 800 }}>
            ⚠️ {error}
          </div>
        )}

        {truncated && (
          <div style={{ ...S.card, background: "#fff7ed", borderColor: "#fcd9a4", color: "#8a5a12", fontWeight: 800 }}>
            ⚠️ {t({
              en: "This period has more records than one page can hold, so the oldest are not included and the totals below understate it. Narrow the period.",
              ar: "هذه الفترة فيها سجلات أكثر مما يُحمَّل دفعة واحدة، فالأقدم غير محسوب والمجاميع تحت أقل من الحقيقة. ضيّق الفترة.",
            })}
          </div>
        )}

        {loading ? (
          <Card><Skeleton rows={10} /></Card>
        ) : !rows.length ? (
          <Card>
            <EmptyBox>
              {t({ en: "No cutting records in this period.", ar: "لا توجد سجلات تقطيع بهذه الفترة." })}
            </EmptyBox>
          </Card>
        ) : (
          <>
            {/* ══ ترويسة الوثيقة الرسمية ══ */}
            <Card style={{ borderColor: C.line2 }}>
              <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
                {REP.logoUrl ? (
                  <img src={REP.logoUrl} alt="" style={{ height: 62, objectFit: "contain" }} />
                ) : null}
                <div style={{ flex: 1, minWidth: 220, textAlign: "center" }}>
                  {(REP.companyEn || REP.companyAr) && (
                    <div style={{ fontWeight: 900, color: C.blueDk, fontSize: "1.1em" }}>
                      {isAr ? REP.companyAr || REP.companyEn : REP.companyEn || REP.companyAr}
                    </div>
                  )}
                  <div className="bk-sec" style={{ color: C.ink, marginTop: 2 }}>
                    {t({
                      en: "SUMMARY REPORT OF ALL CUTTINGS BY DATE",
                      ar: "التقرير الشامل لكل عمليات التقطيع حسب التاريخ",
                    })}
                  </div>
                  <div className="bk-lbl" style={{ color: C.muted, marginTop: 4 }}>
                    {t({ en: "Period", ar: "الفترة" })}: {from} → {to}
                    {branch ? ` · ${nameOf(BRANCHES.find((b) => b.code === branch) || {}, isAr)}` : ""}
                    {" · "}{t({ en: "Printed", ar: "طُبع" })}: {printedAt}
                  </div>
                </div>
                <div className="bk-lbl" style={{ color: C.muted, textAlign: "end", minWidth: 130 }}>
                  {REP.docNo && <div>{t({ en: "Doc", ar: "وثيقة" })}: <b>{REP.docNo}</b></div>}
                  {REP.revNo && <div>{t({ en: "Rev", ar: "مراجعة" })}: <b>{REP.revNo}</b></div>}
                  {REP.issueDate && <div>{t({ en: "Issue", ar: "الإصدار" })}: <b>{REP.issueDate}</b></div>}
                </div>
              </div>
            </Card>

            {/* ══ المؤشّرات مع المقارنة ══ */}
            <div className="bk-kpis" style={S.kpiGrid}>
              <Kpi label={t({ en: "Transactions", ar: "المعاملات" })} value={stats.count}
                color={C.blue} delta={deltaPct(stats.count, prev.count)}
                hint={t({ en: `${stats.butchers} butchers`, ar: `${stats.butchers} جزار` })} />
              <Kpi label={t({ en: "Raw material", ar: "المادة الخام" })} value={kg(stats.carcassKg)} unit="kg"
                color={C.blueDk} delta={deltaPct(stats.carcassKg, prev.carcassKg)} />
              <Kpi label={t({ en: "Products", ar: "النواتج" })} value={kg(stats.cutsKg)} unit="kg"
                color={C.teal} delta={deltaPct(stats.cutsKg, prev.cutsKg)} />
              <Kpi label={t({ en: "Waste", ar: "الهدر" })} value={kg(stats.wasteKg)} unit="kg"
                color={C.amber} delta={deltaPct(stats.wasteKg, prev.wasteKg)} />
              <Kpi label={t({ en: "Net yield", ar: "نسبة التصافي" })} value={stats.yieldPct.toFixed(1)} unit="%"
                color={C.green} delta={deltaPct(stats.yieldPct, prev.yieldPct)} />
              <Kpi label={t({ en: "Waste %", ar: "نسبة الهدر" })} value={stats.wastePct.toFixed(1)} unit="%"
                color={C.red} delta={deltaPct(stats.wastePct, prev.wastePct)} />
              <Kpi label={t({ en: "Avg raw / job", ar: "متوسط الخام" })} value={kg(stats.avgCarcass)} unit="kg"
                color={C.violet} />
            </div>
            <div className="bk-lbl bk-noprint" style={{ color: C.muted, marginTop: -8, marginBottom: 16 }}>
              {t({
                en: "▲▼ compares with the previous period of the same length.",
                ar: "▲▼ مقارنة بالفترة السابقة بنفس الطول.",
              })}
            </div>

            {/* ══ الاتجاه ══ */}
            <Card icon="📈" title={t({ en: "Trends", ar: "الاتجاهات" })}>
              <div className="bk-lbl" style={{ color: C.muted, marginBottom: 6 }}>
                {t({ en: "Net yield % by day", ar: "نسبة التصافي حسب اليوم" })}
              </div>
              <LineChart data={yieldSeries} unit="%" />
              <div className="bk-lbl" style={{ color: C.muted, margin: "14px 0 6px" }}>
                {t({ en: "Raw material volume by day (kg)", ar: "كمية المادة الخام حسب اليوم (كجم)" })}
              </div>
              <LineChart data={volumeSeries} unit="kg" color={C.blue} />
              {topRecipes.length > 1 && (
                <>
                  <div className="bk-lbl" style={{ color: C.muted, margin: "14px 0 6px" }}>
                    {t({ en: "Top recipes by volume (kg)", ar: "أعلى الوصفات حجماً (كجم)" })}
                  </div>
                  <BarChart data={topRecipes} unit=" kg" />
                </>
              )}
            </Card>

            {/* ══ حسب التاريخ ══ */}
            <Card icon="📆" title={t({ en: "By date", ar: "حسب التاريخ" })}>
              <div className="bk-tablewrap" style={S.tableWrap}>
                <table style={S.table}>
                  <thead>
                    <tr>
                      <th style={S.th}>{t({ en: "Date", ar: "التاريخ" })}</th>
                      <th style={{ ...S.th, textAlign: "end" }}>{t({ en: "Jobs", ar: "المعاملات" })}</th>
                      <th style={{ ...S.th, textAlign: "end" }}>{t({ en: "Raw kg", ar: "الخام" })}</th>
                      <th style={{ ...S.th, textAlign: "end" }}>{t({ en: "Products", ar: "النواتج" })}</th>
                      <th style={{ ...S.th, textAlign: "end" }}>{t({ en: "Waste", ar: "الهدر" })}</th>
                      <th style={{ ...S.th, textAlign: "end" }}>{t({ en: "Yield %", ar: "التصافي ٪" })}</th>
                      <th style={{ ...S.th, textAlign: "end" }}>{t({ en: "Waste %", ar: "الهدر ٪" })}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byDate.map((d) => (
                      <tr key={d.day}>
                        <td style={{ ...S.td, fontWeight: 900 }}>{d.day}</td>
                        <td style={{ ...S.td, ...S.tdNum }}>{d.count}</td>
                        <td style={{ ...S.td, ...S.tdNum }}>{kg(d.carcassKg)}</td>
                        <td style={{ ...S.td, ...S.tdNum, color: C.teal }}>{kg(d.cutsKg)}</td>
                        <td style={{ ...S.td, ...S.tdNum, color: C.amber }}>{kg(d.wasteKg)}</td>
                        <td style={{ ...S.td, ...S.tdNum, color: C.green }}>{d.yieldPct.toFixed(1)}%</td>
                        <td style={{ ...S.td, ...S.tdNum, color: C.red }}>{d.wastePct.toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: C.soft }}>
                      <td style={{ ...S.td, fontWeight: 900 }}>{t({ en: "Total", ar: "الإجمالي" })}</td>
                      <td style={{ ...S.td, ...S.tdNum }}>{stats.count}</td>
                      <td style={{ ...S.td, ...S.tdNum }}>{kg(stats.carcassKg)}</td>
                      <td style={{ ...S.td, ...S.tdNum, color: C.teal }}>{kg(stats.cutsKg)}</td>
                      <td style={{ ...S.td, ...S.tdNum, color: C.amber }}>{kg(stats.wasteKg)}</td>
                      <td style={{ ...S.td, ...S.tdNum, color: C.green }}>{stats.yieldPct.toFixed(1)}%</td>
                      <td style={{ ...S.td, ...S.tdNum, color: C.red }}>{stats.wastePct.toFixed(1)}%</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </Card>

            {/* ══ المنتجات مقابل الأهداف ══ */}
            <Card
              className="bk-pagebreak"
              icon="🎯"
              title={t({ en: "Products vs recipe targets", ar: "المنتجات مقابل أهداف الوصفات" })}
              sub={t({
                en: "Deviation beyond ±10% deserves a review of the cutting spec or the practice.",
                ar: "الانحراف فوق ±١٠٪ بيستاهل مراجعة مواصفة التقطيع أو طريقة العمل.",
              })}
            >
              <div className="bk-tablewrap" style={S.tableWrap}>
                <table style={S.table}>
                  <thead>
                    <tr>
                      <th style={S.th}>{t({ en: "Product", ar: "المنتج" })}</th>
                      <th style={S.th}>{t({ en: "Code", ar: "الكود" })}</th>
                      <th style={{ ...S.th, textAlign: "end" }}>{t({ en: "Lines", ar: "الأسطر" })}</th>
                      <th style={{ ...S.th, textAlign: "end" }}>{t({ en: "Actual kg", ar: "الفعلي" })}</th>
                      <th style={{ ...S.th, textAlign: "end" }}>{t({ en: "Target kg", ar: "المستهدف" })}</th>
                      <th style={{ ...S.th, textAlign: "end" }}>{t({ en: "Deviation", ar: "الانحراف" })}</th>
                      <th style={S.th}>{t({ en: "Share of raw", ar: "الحصّة من الخام" })}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((p, i) => (
                      <tr key={`${p.sku}${i}`}>
                        <td style={S.td}>
                          <b>{p.name}</b>{" "}
                          {p.isWaste && <Chip tone="amber">{t({ en: "waste", ar: "هدر" })}</Chip>}
                          {p.nameAlt && (
                            <div className="bk-lbl" style={{ color: C.muted }}>{p.nameAlt}</div>
                          )}
                        </td>
                        <td style={{ ...S.td, color: C.muted, fontWeight: 800 }}>{p.sku || "—"}</td>
                        <td style={{ ...S.td, ...S.tdNum }}>{p.n}</td>
                        <td style={{ ...S.td, ...S.tdNum }}>{kg(p.actual)}</td>
                        <td style={{ ...S.td, ...S.tdNum, color: C.muted }}>
                          {p.target ? kg(p.target) : "—"}
                        </td>
                        <td style={{ ...S.td, ...S.tdNum }}><DeltaCell value={p.deviation} /></td>
                        <td style={S.td}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <MiniBar value={p.share} max={100} color={p.isWaste ? C.amber : C.teal} />
                            <span style={{ fontWeight: 800, minWidth: 52 }}>{p.share.toFixed(1)}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* ══ حسب الفئة / الوصفة / الملحمة ══ */}
            {[
              { icon: "🗂️", title: t({ en: "By category", ar: "حسب الفئة" }), data: byCategory },
              { icon: "📐", title: t({ en: "By recipe", ar: "حسب الوصفة" }), data: byRecipe },
              { icon: "🏬", title: t({ en: "By butchery", ar: "حسب الملحمة" }), data: byBranch },
            ].map((sec) => (
              <Card key={sec.title} icon={sec.icon} title={sec.title}>
                <div className="bk-tablewrap" style={S.tableWrap}>
                  <table style={S.table}>
                    <thead>
                      <tr>
                        <th style={S.th}>{sec.title}</th>
                        <th style={{ ...S.th, textAlign: "end" }}>{t({ en: "Jobs", ar: "المعاملات" })}</th>
                        <th style={{ ...S.th, textAlign: "end" }}>{t({ en: "Raw kg", ar: "الخام" })}</th>
                        <th style={{ ...S.th, textAlign: "end" }}>{t({ en: "Products", ar: "النواتج" })}</th>
                        <th style={{ ...S.th, textAlign: "end" }}>{t({ en: "Waste", ar: "الهدر" })}</th>
                        <th style={S.th}>{t({ en: "Yield", ar: "التصافي" })}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sec.data.map((g) => (
                        <tr key={g.key}>
                          <td style={{ ...S.td, fontWeight: 900 }}>{g.key}</td>
                          <td style={{ ...S.td, ...S.tdNum }}>{g.count}</td>
                          <td style={{ ...S.td, ...S.tdNum }}>{kg(g.carcassKg)}</td>
                          <td style={{ ...S.td, ...S.tdNum, color: C.teal }}>{kg(g.cutsKg)}</td>
                          <td style={{ ...S.td, ...S.tdNum, color: C.amber }}>{kg(g.wasteKg)}</td>
                          <td style={S.td}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <MiniBar value={g.yieldPct} max={100} color={C.green} />
                              <span style={{ fontWeight: 900, color: C.green, minWidth: 52 }}>
                                {g.yieldPct.toFixed(1)}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            ))}

            {/* ══ أداء الجزارين ══ */}
            <Card
              icon="🧑‍🍳"
              title={t({ en: "Butcher performance", ar: "أداء الجزارين" })}
              sub={t({
                en: "Consistency compares each butcher's yield spread — a tighter spread is steadier work.",
                ar: "الثبات بيقارن تشتّت تصافي كل جزار — كل ما قلّ التشتّت كان الأداء أثبت.",
              })}
            >
              <div className="bk-tablewrap" style={S.tableWrap}>
                <table style={S.table}>
                  <thead>
                    <tr>
                      <th style={S.th}>{t({ en: "Butcher", ar: "الجزار" })}</th>
                      <th style={{ ...S.th, textAlign: "end" }}>{t({ en: "Jobs", ar: "المعاملات" })}</th>
                      <th style={{ ...S.th, textAlign: "end" }}>{t({ en: "Raw kg", ar: "الخام" })}</th>
                      <th style={{ ...S.th, textAlign: "end" }}>{t({ en: "Avg yield", ar: "متوسط التصافي" })}</th>
                      <th style={{ ...S.th, textAlign: "end" }}>{t({ en: "Waste %", ar: "الهدر ٪" })}</th>
                      <th style={S.th}>{t({ en: "Consistency", ar: "الثبات" })}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byButcher.map((b) => (
                      <tr key={b.name}>
                        <td style={{ ...S.td, fontWeight: 900 }}>{b.name}</td>
                        <td style={{ ...S.td, ...S.tdNum }}>{b.count}</td>
                        <td style={{ ...S.td, ...S.tdNum }}>{kg(b.carcassKg)}</td>
                        <td style={{ ...S.td, ...S.tdNum, color: C.green }}>{b.yieldPct.toFixed(1)}%</td>
                        <td style={{ ...S.td, ...S.tdNum, color: C.amber }}>{b.wastePct.toFixed(1)}%</td>
                        <td style={S.td}>
                          {b.steady === "high" ? (
                            <Chip tone="green">✓ {t({ en: "Steady", ar: "ثابت" })} (±{b.sd.toFixed(1)})</Chip>
                          ) : b.steady === "mid" ? (
                            <Chip tone="amber">~ {t({ en: "Variable", ar: "متذبذب" })} (±{b.sd.toFixed(1)})</Chip>
                          ) : (
                            <Chip tone="red">! {t({ en: "Unstable", ar: "غير مستقر" })} (±{b.sd.toFixed(1)})</Chip>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* ══ الانحرافات وجودة البيانات ══ */}
            <Card
              icon="⚠️"
              title={t({ en: "Deviations & data quality", ar: "الانحرافات وجودة البيانات" })}
              sub={issues.length
                ? t({ en: `${issues.length} item(s) need attention`, ar: `${issues.length} بند بحاجة انتباه` })
                : t({ en: "Nothing flagged in this period.", ar: "لا ملاحظات بهذه الفترة." })}
            >
              {!issues.length ? (
                <EmptyBox>
                  ✅ {t({ en: "All records are clean.", ar: "كل السجلات سليمة." })}
                </EmptyBox>
              ) : (
                <div className="bk-tablewrap" style={S.tableWrap}>
                  <table style={S.table}>
                    <thead>
                      <tr>
                        <th style={S.th}>{t({ en: "Date", ar: "التاريخ" })}</th>
                        <th style={S.th}>{t({ en: "Butcher", ar: "الجزار" })}</th>
                        <th style={S.th}>{t({ en: "Recipe", ar: "الوصفة" })}</th>
                        <th style={S.th}>{t({ en: "Issue", ar: "الملاحظة" })}</th>
                        <th style={S.th}>{t({ en: "Detail", ar: "التفصيل" })}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {issues.slice(0, 100).map((x, i) => (
                        <tr key={i}>
                          <td style={S.td}>{x.day}</td>
                          <td style={S.td}>{x.who}</td>
                          <td style={S.td}>{x.ref || "—"}</td>
                          <td style={S.td}><Chip tone={x.tone}>{x.kind}</Chip></td>
                          <td style={{ ...S.td, fontWeight: 800 }}>{x.detail}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>

            {/* ══ التواقيع ══ */}
            {Array.isArray(REP.signatures) && REP.signatures.length > 0 && (
              <Card icon="✍️" title={t({ en: "Signatures", ar: "التواقيع" })}>
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit,minmax(min(220px,100%),1fr))",
                  gap: 18,
                }}>
                  {REP.signatures.map((s, i) => (
                    <div key={i} style={{ textAlign: "center" }}>
                      <div style={{ height: 54, borderBottom: `2px solid ${C.line2}` }} />
                      <div className="bk-lbl" style={{ color: C.ink2, marginTop: 8, fontWeight: 900 }}>
                        {isAr ? s.ar || s.en : s.en || s.ar}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            <div className="bk-lbl" style={{ textAlign: "center", color: C.muted, marginTop: 8 }}>
              {t({ en: "Generated by the QMS on", ar: "أُنشئ من النظام في" })} {printedAt}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
