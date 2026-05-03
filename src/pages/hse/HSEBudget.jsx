// src/pages/hse/HSEBudget.jsx — bilingual

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  pageStyle, containerStyle, headerBar, buttonGhost,
  cardStyle, inputStyle, HSE_COLORS,
  loadLocal, saveLocal,
  tableStyle, thStyle, tdStyle, useHSELang, HSELangToggle,
} from "./hseShared";

const TYPE = "budget_tracking";

const T = {
  title: { ar: "💰 الميزانية التقديرية السنوية", en: "💰 Annual Budget Estimate" },
  subtitle: { ar: "CAPEX (التأسيس مرة واحدة) + OPEX (تشغيلية سنوية) + متابعة المنفق فعلياً",
              en: "CAPEX (one-time setup) + OPEX (annual operations) + Actual spend tracking" },
  pageIntro: {
    ar: "هذا تقدير مبدئي للميزانية المطلوبة لتأسيس وتشغيل قسم HSE في السنة الأولى. الأرقام بالدرهم الإماراتي وتتراوح ضمن نطاق لأنها تعتمد على عدة متغيرات (الموردين، الخبرات المتاحة، حجم المنشأة). يمكن إدخال المنفق الفعلي في كل بند لمتابعة الإنفاق الحقيقي مقابل الميزانية. الميزانية ليست تكلفة بل استثمار: تجنّب حادث واحد كبير + الحصول على FSSC 22000 يمكن أن يغطّي ميزانية القسم بالكامل لعدة سنوات (راجع جدول العائد على الاستثمار في الأسفل).",
    en: "This is a preliminary estimate of the budget required to establish and operate the HSE department in Year 1. Amounts are in AED and presented as ranges since they depend on several variables (suppliers, available expertise, facility size). Actual spend can be entered against each line to track real expenditure vs the budget. The budget is not a cost — it's an investment: avoiding a single major incident + achieving FSSC 22000 can cover the entire department budget for several years (see ROI table at the bottom).",
  },
  back: { ar: "← HSE", en: "← HSE" },
  capexTotal: { ar: "إجمالي CAPEX (تأسيس)", en: "Total CAPEX (Setup)" },
  opexTotal: { ar: "إجمالي OPEX (سنوي)", en: "Total OPEX (Annual)" },
  totalY1: { ar: "الإجمالي السنة الأولى", en: "Year 1 Grand Total" },
  spent: { ar: "المنفق:", en: "Spent:" },
  actualSpent: { ar: "المنفق فعلياً:", en: "Actually spent:" },
  capexTitle: { ar: "🏗️ تكاليف التأسيس CAPEX (مرة واحدة)", en: "🏗️ CAPEX Setup Costs (One-time)" },
  opexTitle: { ar: "💼 التكاليف التشغيلية OPEX (سنوي)", en: "💼 OPEX Operating Costs (Annual)" },
  cols: {
    item: { ar: "البند", en: "Item" },
    min: { ar: "الحد الأدنى (درهم)", en: "Min (AED)" },
    max: { ar: "الحد الأقصى (درهم)", en: "Max (AED)" },
    actual: { ar: "المنفق فعلياً (درهم)", en: "Actual (AED)" },
    status: { ar: "الحالة", en: "Status" },
    factor: { ar: "عامل التبرير", en: "Justification Factor" },
    avoidedMin: { ar: "التكلفة المُتجنَّبة (الحد الأدنى)", en: "Avoided cost (Min)" },
    avoidedMax: { ar: "التكلفة المُتجنَّبة (الحد الأعلى)", en: "Avoided cost (Max)" },
  },
  total: { ar: "الإجمالي", en: "Total" },
  notSpent: { ar: "لم يُنفق", en: "Not spent" },
  underBudget: { ar: "أقل من المتوقع ✅", en: "Under budget ✅" },
  inRange: { ar: "ضمن النطاق ✅", en: "Within range ✅" },
  overBudget: { ar: "تجاوز الميزانية ⚠️", en: "Over budget ⚠️" },
  roiTitle: { ar: "📈 العائد على الاستثمار (ROI) — كيف تُبرَّر الميزانية؟",
              en: "📈 Return on Investment (ROI) — How is the budget justified?" },
  conclusion: { ar: "💡 الخلاصة:", en: "💡 Bottom line:" },
  conclusionText: {
    ar: "ميزانية HSE ليست تكلفة، بل استثمار يحمي الشركة من خسائر تتجاوزها أضعافاً. تجنّب حادث واحد كبير + الحصول على FSSC 22000 يمكن أن يغطّي ميزانية القسم بالكامل لعدة سنوات.",
    en: "The HSE budget is not a cost — it's an investment protecting the company from far greater losses. Avoiding a single major incident + achieving FSSC 22000 can cover the entire department budget for several years.",
  },
};

const CAPEX = [
  { id: "cap-1", item: { ar: "تجهيز مكاتب القسم (أثاث + أجهزة)", en: "Department office setup (furniture + equipment)" }, min: 25000, max: 45000 },
  { id: "cap-2", item: { ar: "نظام إدارة HSE رقمي (SharePoint / HSE Software)", en: "Digital HSE management system (SharePoint / HSE software)" }, min: 30000, max: 80000 },
  { id: "cap-3", item: { ar: "كواشف غازات (أمونيا / CO / تسرب)", en: "Gas detectors (Ammonia / CO / leak)" }, min: 40000, max: 90000 },
  { id: "cap-4", item: { ar: "معدات الإسعافات الأولية (صناديق، AED)", en: "First-aid equipment (kits, AED)" }, min: 15000, max: 30000 },
  { id: "cap-5", item: { ar: "معدات إطفاء إضافية وبطانيات حريق", en: "Additional firefighting equipment and fire blankets" }, min: 20000, max: 40000 },
  { id: "cap-6", item: { ar: "أجهزة تسجيل الحرارة (Data Loggers)", en: "Temperature data loggers" }, min: 25000, max: 50000 },
  { id: "cap-7", item: { ar: "لوحات إرشادية وملصقات السلامة", en: "Safety signage and posters" }, min: 10000, max: 20000 },
  { id: "cap-8", item: { ar: "دراسة واستشارات ISO / FSSC الأولية", en: "Initial ISO / FSSC consultancy" }, min: 30000, max: 70000 },
];

const OPEX = [
  { id: "op-1",  item: { ar: "رواتب فريق HSE (6 موظفين شاملة البدلات)", en: "HSE team salaries (6 staff incl. allowances)" }, min: 720000, max: 1080000 },
  { id: "op-2",  item: { ar: "معدات الوقاية الشخصية (لجميع العاملين)", en: "PPE for all workers" }, min: 80000, max: 150000 },
  { id: "op-3",  item: { ar: "التدريب السنوي (دورات داخلية وخارجية)", en: "Annual training (internal + external)" }, min: 90000, max: 180000 },
  { id: "op-4",  item: { ar: "الفحوصات الميكروبية والمخبرية", en: "Microbiological & laboratory testing" }, min: 40000, max: 75000 },
  { id: "op-5",  item: { ar: "برنامج مكافحة الحشرات (عقد سنوي)", en: "Pest control program (annual contract)" }, min: 35000, max: 55000 },
  { id: "op-6",  item: { ar: "فحوصات طبية للعاملين", en: "Worker medical checks" }, min: 25000, max: 45000 },
  { id: "op-7",  item: { ar: "صيانة أنظمة الإطفاء والإنذار", en: "Fire suppression & alarm system maintenance" }, min: 30000, max: 55000 },
  { id: "op-8",  item: { ar: "رسوم التدقيق والشهادات السنوية", en: "Annual audit and certification fees" }, min: 60000, max: 120000 },
  { id: "op-9",  item: { ar: "تجديد التراخيص الحكومية", en: "Government license renewals" }, min: 15000, max: 30000 },
  { id: "op-10", item: { ar: "الطوارئ والمصاريف غير المتوقعة (5%)", en: "Emergencies & contingency (5%)" }, min: 55000, max: 90000 },
];

const ROI_FACTORS = [
  { factor: { ar: "متوسط غرامة بلدية دبي لمخالفة واحدة في سلامة الغذاء", en: "Average DM fine for one food-safety violation" }, min: "10,000", max: "50,000 AED" },
  { factor: { ar: "تكلفة إصابة عمل واحدة (تعويض + علاج + توقف إنتاج)", en: "Cost of one work injury (compensation + treatment + lost production)" }, min: "30,000", max: "150,000 AED" },
  { factor: { ar: "تكلفة سحب شحنة واحدة فاسدة من السوق", en: "Cost of recalling one spoiled shipment from market" }, min: "200,000", max: { ar: "1,000,000 درهم + ضرر سمعة", en: "1,000,000 AED + reputational damage" } },
  { factor: { ar: "تكلفة إغلاق المنشأة لـ 24 ساعة", en: "Cost of facility closure for 24 hours" }, min: "100,000+", max: "—" },
  { factor: { ar: "الحصول على FSSC 22000 (عقود جديدة)", en: "Achieving FSSC 22000 (new contracts)" }, min: "+ 5,000,000", max: { ar: "درهم سنوياً", en: "AED annually" } },
];

function txt(v, lang) {
  if (v == null) return "";
  if (typeof v === "string") return v;
  return v[lang] ?? v.ar ?? v.en ?? "";
}

export default function HSEBudget() {
  const navigate = useNavigate();
  const { lang, toggle, dir, pick } = useHSELang();
  const [actuals, setActuals] = useState({});

  useEffect(() => {
    const saved = loadLocal(TYPE);
    const map = {};
    saved.forEach((a) => { map[a.lineId] = a; });
    setActuals(map);
  }, []);

  function setActual(lineId, item, val) {
    const v = Number(val) || 0;
    const updated = { ...actuals, [lineId]: { lineId, item, actual: v } };
    setActuals(updated);
    saveLocal(TYPE, Object.values(updated));
  }

  const totals = useMemo(() => {
    const capexMin = CAPEX.reduce((a, c) => a + c.min, 0);
    const capexMax = CAPEX.reduce((a, c) => a + c.max, 0);
    const opexMin = OPEX.reduce((a, c) => a + c.min, 0);
    const opexMax = OPEX.reduce((a, c) => a + c.max, 0);
    const capexActual = CAPEX.reduce((a, c) => a + (actuals[c.id]?.actual || 0), 0);
    const opexActual = OPEX.reduce((a, c) => a + (actuals[c.id]?.actual || 0), 0);
    return {
      capexMin, capexMax, opexMin, opexMax,
      totalMin: capexMin + opexMin, totalMax: capexMax + opexMax,
      capexActual, opexActual, totalActual: capexActual + opexActual,
    };
  }, [actuals]);

  const fmt = (n) => Number(n).toLocaleString("en-US");

  function renderTable(title, lines, color) {
    return (
      <div style={{ ...cardStyle, marginBottom: 16 }}>
        <div style={{ fontSize: 16, fontWeight: 950, marginBottom: 12, color }}>{title}</div>
        <div style={{ overflowX: "auto" }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>{pick(T.cols.item)}</th>
                <th style={thStyle}>{pick(T.cols.min)}</th>
                <th style={thStyle}>{pick(T.cols.max)}</th>
                <th style={thStyle}>{pick(T.cols.actual)}</th>
                <th style={thStyle}>{pick(T.cols.status)}</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l) => {
                const actual = actuals[l.id]?.actual || 0;
                let status = "—", statusColor = "#64748b";
                if (actual === 0) { status = pick(T.notSpent); statusColor = "#64748b"; }
                else if (actual < l.min) { status = pick(T.underBudget); statusColor = "#166534"; }
                else if (actual >= l.min && actual <= l.max) { status = pick(T.inRange); statusColor = "#166534"; }
                else { status = pick(T.overBudget); statusColor = "#7f1d1d"; }
                return (
                  <tr key={l.id}>
                    <td style={{ ...tdStyle, fontWeight: 700 }}>{txt(l.item, lang)}</td>
                    <td style={{ ...tdStyle, textAlign: "center" }}>{fmt(l.min)}</td>
                    <td style={{ ...tdStyle, textAlign: "center" }}>{fmt(l.max)}</td>
                    <td style={{ ...tdStyle, textAlign: "center" }}>
                      <input type="number" min="0" value={actuals[l.id]?.actual || ""} onChange={(e) => setActual(l.id, l.item, e.target.value)} placeholder="0"
                        style={{ ...inputStyle, maxWidth: 120, textAlign: "center", fontWeight: 800 }} />
                    </td>
                    <td style={{ ...tdStyle, color: statusColor, fontWeight: 800, fontSize: 12 }}>{status}</td>
                  </tr>
                );
              })}
              <tr style={{ background: "#fef3c7" }}>
                <td style={{ ...tdStyle, fontWeight: 950 }}>{pick(T.total)}</td>
                <td style={{ ...tdStyle, textAlign: "center", fontWeight: 950 }}>{fmt(lines.reduce((a, c) => a + c.min, 0))}</td>
                <td style={{ ...tdStyle, textAlign: "center", fontWeight: 950 }}>{fmt(lines.reduce((a, c) => a + c.max, 0))}</td>
                <td style={{ ...tdStyle, textAlign: "center", fontWeight: 950, color: HSE_COLORS.primary }}>{fmt(lines.reduce((a, c) => a + (actuals[c.id]?.actual || 0), 0))}</td>
                <td style={tdStyle}>—</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  }

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
            <button style={buttonGhost} onClick={() => navigate("/hse")}>{pick(T.back)}</button>
          </div>
        </div>

        <div style={{ ...cardStyle, marginBottom: 14, background: "linear-gradient(135deg, #f3f4f6, #ffffff)", borderInlineStart: "5px solid #1f2937" }}>
          <p style={{ fontSize: 14, lineHeight: 1.9, color: "#1f0f00", margin: 0 }}>{pick(T.pageIntro)}</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginBottom: 16 }}>
          <div style={{ ...cardStyle, padding: 14, background: "#dbeafe" }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#1e40af" }}>{pick(T.capexTotal)}</div>
            <div style={{ fontSize: 18, fontWeight: 950, color: "#1e40af", marginTop: 4 }}>{fmt(totals.capexMin)} – {fmt(totals.capexMax)}</div>
            <div style={{ fontSize: 11, color: "#64748b", marginTop: 6 }}>{pick(T.spent)} <b>{fmt(totals.capexActual)}</b> AED</div>
          </div>
          <div style={{ ...cardStyle, padding: 14, background: "#fed7aa" }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#9a3412" }}>{pick(T.opexTotal)}</div>
            <div style={{ fontSize: 18, fontWeight: 950, color: "#9a3412", marginTop: 4 }}>{fmt(totals.opexMin)} – {fmt(totals.opexMax)}</div>
            <div style={{ fontSize: 11, color: "#64748b", marginTop: 6 }}>{pick(T.spent)} <b>{fmt(totals.opexActual)}</b> AED</div>
          </div>
          <div style={{ ...cardStyle, padding: 14, background: "linear-gradient(135deg, #fee2e2, #fed7aa)" }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#7f1d1d" }}>{pick(T.totalY1)}</div>
            <div style={{ fontSize: 18, fontWeight: 950, color: "#7f1d1d", marginTop: 4 }}>{fmt(totals.totalMin)} – {fmt(totals.totalMax)}</div>
            <div style={{ fontSize: 11, color: "#64748b", marginTop: 6 }}>{pick(T.actualSpent)} <b>{fmt(totals.totalActual)}</b> AED</div>
          </div>
        </div>

        {renderTable(pick(T.capexTitle), CAPEX, "#1e40af")}
        {renderTable(pick(T.opexTitle), OPEX, "#9a3412")}

        <div style={{ ...cardStyle, marginBottom: 16, background: "linear-gradient(135deg, #dcfce7, #f0fdf4)" }}>
          <div style={{ fontSize: 16, fontWeight: 950, marginBottom: 12, color: "#166534" }}>{pick(T.roiTitle)}</div>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>{pick(T.cols.factor)}</th>
                <th style={thStyle}>{pick(T.cols.avoidedMin)}</th>
                <th style={thStyle}>{pick(T.cols.avoidedMax)}</th>
              </tr>
            </thead>
            <tbody>
              {ROI_FACTORS.map((f, i) => (
                <tr key={i}>
                  <td style={{ ...tdStyle, fontWeight: 700 }}>{txt(f.factor, lang)}</td>
                  <td style={{ ...tdStyle, textAlign: "center", fontWeight: 800, color: "#166534" }}>{txt(f.min, lang)}</td>
                  <td style={{ ...tdStyle, textAlign: "center", fontWeight: 800, color: "#166534" }}>{txt(f.max, lang)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ marginTop: 12, padding: 12, borderRadius: 10, background: "#fff", fontSize: 13, lineHeight: 1.7, color: "#166534" }}>
            <b>{pick(T.conclusion)}</b> {pick(T.conclusionText)}
          </div>
        </div>
      </div>
    </main>
  );
}
