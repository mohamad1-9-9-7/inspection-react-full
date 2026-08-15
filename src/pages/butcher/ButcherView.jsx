// src/pages/butcher/ButcherView.jsx
//
// 📋 تقارير الجزار — عرض عصري لتنفيذات وصفات التقطيع (EN/AR).
// Butcher reports viewer, built on the cutting-BOM model.
//
// السيرفر مصدر الحقيقة: GET /api/reports?type=butcher_cut_log
// كل سجل = تنفيذ وصفة: مادة خام داخلة → منتجات نهائية + هدر، بأوزان فعلية
// وأوزان مستهدفة من الوصفة. السجلات القديمة تُقرأ بلا كسر (انظر العُدّة).
//
// الأدوات: فلاتر ذكية (فترة · ملحمة · فئة · وصفة · حالة · بحث حر · المنحرف فقط) ·
//          مؤشّرات حيّة · المنتجات مقابل أهداف الوصفة · ملخّص يومي ·
//          ملاحظات وجودة البيانات · تجميع مرن · فرز بالأعمدة ·
//          تفاصيل كل تنفيذ بالضغط · Excel (٥ أوراق) · PDF · طباعة.

import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BRANCHES, nameOf } from "./butcherOptions";
import { useSettingsLang, LangToggle } from "../settings/_shared/settingsI18n";
import { canOpenButcherPage, NoAccess } from "./ButcherAccess";
import {
  C, Card, Chip, DeltaCell, EmptyBox, ErrorNote, KIT_CSS, Kpi, MiniBar, PageHead,
  ReviewChip, S, Skeleton, SortTh, downloadExcel, downloadPdf, kg, monthStart,
  pct, shiftDays, sortRows, todayStr, totalsOf, useButcherData, useNormalizedRows,
} from "./butcherReportKit";

/* مفاتيح التجميع المتاحة */
const GROUPS = [
  { id: "employeeNo", ar: "الجزار", en: "Butcher" },
  { id: "bomRef", ar: "الوصفة", en: "Recipe" },
  { id: "bomCatName", ar: "الفئة", en: "Category" },
  { id: "inputName", ar: "المادة الخام", en: "Raw material" },
  { id: "branchName", ar: "الملحمة", en: "Butchery" },
  { id: "day", ar: "اليوم", en: "Day" },
];

export default function ButcherView() {
  const navigate = useNavigate();
  const { t, isAr, dir, lang, toggle } = useSettingsLang();
  /* ── الفلاتر ── */
  // المدى يُمرَّر للسيرفر ليجلب نافذته فقط، فتغييره يُعيد التحميل
  const [from, setFrom] = useState(shiftDays(-30));
  const [to, setTo] = useState(todayStr());

  const { records, loading, error, truncated, reload, cfg, mrpCfg } =
    useButcherData({ from, to });
  const all = useNormalizedRows(records, { cfg, mrpCfg, isAr });

  const [branch, setBranch] = useState("");
  const [catId, setCatId] = useState("");
  const [bomRef, setBomRef] = useState("");
  const [q, setQ] = useState("");
  const [review, setReview] = useState("");
  const [onlyDeviating, setOnlyDeviating] = useState(false);

  /* ── خيارات العرض ── */
  const [groupKey, setGroupKey] = useState("employeeNo");
  const [mode, setMode] = useState("detailed");   // detailed | grouped
  const [sort, setSort] = useState({ key: "day", dir: "desc" });
  const [openId, setOpenId] = useState("");        // السطر المفتوح بالتفاصيل

  const toggleSort = (key) =>
    setSort((s) => ({ key, dir: s.key === key && s.dir === "desc" ? "asc" : "desc" }));

  /* قوائم الفلاتر مبنية من البيانات نفسها — بلا اعتماد على شجرة محذوفة */
  const catOptions = useMemo(() => {
    const m = new Map();
    all.forEach((r) => { if (r.bomCatName) m.set(r.bomCatId, r.bomCatName); });
    return [...m.entries()].map(([id, name]) => ({ id, name }));
  }, [all]);

  const bomOptions = useMemo(() => {
    const s = new Set(all.map((r) => r.bomRef).filter(Boolean));
    return [...s].sort();
  }, [all]);

  /* ── التطبيق ── */
  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const out = all.filter((r) => {
      if (from && r.day < from) return false;
      if (to && r.day > to) return false;
      if (branch && r.branchCode !== branch) return false;
      if (catId && r.bomCatId !== catId) return false;
      if (bomRef && r.bomRef !== bomRef) return false;
      if (review && (r.reviewStatus || "pending") !== review) return false;
      if (onlyDeviating && !r.cuts.some((c) => c.deltaPct !== null && Math.abs(c.deltaPct) > 10)) {
        return false;
      }
      if (needle) {
        const hay = [
          r.employeeNo, r.employeeNoRaw, r.bomRef, r.inputName, r.inputSku,
          r.branchName, r.bomCatName, ...r.cuts.map((c) => `${c.name} ${c.sku}`),
        ].join(" ").toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
    return sortRows(out, sort.key, sort.dir);
  }, [all, from, to, branch, catId, bomRef, review, onlyDeviating, q, sort]);

  const stats = useMemo(() => totalsOf(rows), [rows]);

  /* تجميع */
  const groups = useMemo(() => {
    const map = new Map();
    rows.forEach((r) => {
      const key = r[groupKey] || "—";
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(r);
    });
    return [...map.entries()]
      .map(([key, list]) => ({ key, list, ...totalsOf(list) }))
      .sort((a, b) => b.carcassKg - a.carcassKg);
  }, [rows, groupKey]);

  /* أداء المنتجات: فعلي مقابل هدف الوصفة */
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
        deltaPct: g.target > 0 ? ((g.actual - g.target) / g.target) * 100 : null,
      }))
      .sort((a, b) => b.actual - a.actual);
  }, [rows, stats.baseKg]);

  /* ملخّص يومي — يغذّي التصدير ولوحة الاتجاه */
  const byDay = useMemo(() => {
    const map = new Map();
    rows.forEach((r) => {
      if (!map.has(r.day)) map.set(r.day, []);
      map.get(r.day).push(r);
    });
    return [...map.entries()]
      .map(([day, list]) => ({ day, ...totalsOf(list) }))
      .sort((a, b) => b.day.localeCompare(a.day));
  }, [rows]);

  /* الملاحظات — فاقد غير مسجّل · انحراف كبير · مرفوض */
  const issues = useMemo(() => {
    const out = [];
    rows.forEach((r) => {
      if (r.unaccountedKg > 0.005) {
        out.push({
          day: r.day, who: r.employeeNo, ref: r.bomRef,
          kind: t({ en: "Unaccounted weight", ar: "فاقد غير مسجّل" }),
          detail: `${kg(r.unaccountedKg)} kg`, tone: "amber",
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

  const resetAll = () => {
    setFrom(shiftDays(-30)); setTo(todayStr()); setBranch(""); setCatId("");
    setBomRef(""); setQ(""); setReview(""); setOnlyDeviating(false);
  };

  const activeFilters =
    (branch ? 1 : 0) + (catId ? 1 : 0) + (bomRef ? 1 : 0) + (q.trim() ? 1 : 0) +
    (review ? 1 : 0) + (onlyDeviating ? 1 : 0);

  /* ── Excel: تفاصيل + تجميع + منتجات ── */
  const exportExcel = async () => {
    const detail = [[
      t({ en: "Cutting date", ar: "تاريخ التقطيع" }),
      t({ en: "Entry date", ar: "تاريخ الإدخال" }),
      t({ en: "Butcher", ar: "الجزار" }),
      t({ en: "Butchery", ar: "الملحمة" }),
      t({ en: "Category", ar: "الفئة" }),
      t({ en: "Recipe", ar: "الوصفة" }),
      t({ en: "Raw material", ar: "المادة الخام" }),
      t({ en: "Raw kg", ar: "وزن الخام" }),
      t({ en: "Pieces", ar: "عدد القطع" }),
      t({ en: "Product", ar: "المنتج" }),
      t({ en: "Code", ar: "الكود" }),
      t({ en: "Kind", ar: "النوع" }),
      t({ en: "Actual kg", ar: "الفعلي" }),
      t({ en: "Target kg", ar: "المستهدف" }),
      t({ en: "Delta %", ar: "الانحراف ٪" }),
      t({ en: "% of raw", ar: "٪ من الخام" }),
      t({ en: "Status", ar: "الحالة" }),
    ]];
    rows.forEach((r) => {
      r.cuts.forEach((c) => {
        detail.push([
          r.day, r.entryDay, r.employeeNo, r.branchName, r.bomCatName, r.bomRef,
          r.inputName, +kg(r.carcassKg), r.pieceCount ?? "",
          c.name, c.sku,
          c.isWaste ? t({ en: "Waste", ar: "هدر" }) : t({ en: "Product", ar: "منتج" }),
          +kg(c.weightKg), c.targetKg ? +kg(c.targetKg) : "",
          c.deltaPct === null ? "" : +c.deltaPct.toFixed(1),
          +pct(c.weightKg, r.baseKg).toFixed(1),
          r.reviewStatus || "pending",
        ]);
      });
    });

    const grouped = [[
      GROUPS.find((g) => g.id === groupKey)?.[isAr ? "ar" : "en"] || groupKey,
      t({ en: "Records", ar: "السجلات" }),
      t({ en: "Raw kg", ar: "وزن الخام" }),
      t({ en: "Products kg", ar: "النواتج" }),
      t({ en: "Waste kg", ar: "الهدر" }),
      t({ en: "Yield %", ar: "التصافي ٪" }),
      t({ en: "Waste %", ar: "الهدر ٪" }),
    ]];
    groups.forEach((g) => grouped.push([
      g.key, g.count, +kg(g.carcassKg), +kg(g.cutsKg), +kg(g.wasteKg),
      +g.yieldPct.toFixed(1), +g.wastePct.toFixed(1),
    ]));

    const prod = [[
      t({ en: "Product", ar: "المنتج" }), t({ en: "Code", ar: "الكود" }),
      t({ en: "Kind", ar: "النوع" }), t({ en: "Lines", ar: "الأسطر" }),
      t({ en: "Actual kg", ar: "الفعلي" }), t({ en: "Target kg", ar: "المستهدف" }),
      t({ en: "Delta %", ar: "الانحراف ٪" }), t({ en: "% of raw", ar: "٪ من الخام" }),
    ]];
    products.forEach((p) => prod.push([
      p.name, p.sku,
      p.isWaste ? t({ en: "Waste", ar: "هدر" }) : t({ en: "Product", ar: "منتج" }),
      p.n, +kg(p.actual), p.target ? +kg(p.target) : "",
      p.deltaPct === null ? "" : +p.deltaPct.toFixed(1), +p.share.toFixed(1),
    ]));

    const daily = [[
      t({ en: "Date", ar: "التاريخ" }), t({ en: "Jobs", ar: "التنفيذات" }),
      t({ en: "Raw kg", ar: "الخام" }), t({ en: "Products kg", ar: "النواتج" }),
      t({ en: "Waste kg", ar: "الهدر" }), t({ en: "Yield %", ar: "التصافي ٪" }),
      t({ en: "Waste %", ar: "الهدر ٪" }),
    ]];
    byDay.forEach((d) => daily.push([
      d.day, d.count, +kg(d.carcassKg), +kg(d.cutsKg), +kg(d.wasteKg),
      +d.yieldPct.toFixed(1), +d.wastePct.toFixed(1),
    ]));

    const notes = [[
      t({ en: "Date", ar: "التاريخ" }), t({ en: "Butcher", ar: "الجزار" }),
      t({ en: "Recipe", ar: "الوصفة" }), t({ en: "Issue", ar: "الملاحظة" }),
      t({ en: "Detail", ar: "التفصيل" }),
    ]];
    issues.forEach((x) => notes.push([x.day, x.who, x.ref || "—", x.kind, x.detail]));

    await downloadExcel(
      [
        { name: "Detail", aoa: detail, widths: [12, 12, 22, 16, 16, 12, 26, 10, 8, 26, 12, 10, 10, 10, 10, 10, 12] },
        { name: "By date", aoa: daily, widths: [12, 10, 12, 12, 12, 10, 10] },
        { name: "Grouped", aoa: grouped, widths: [26, 10, 12, 12, 12, 10, 10] },
        { name: "Products", aoa: prod, widths: [28, 12, 10, 8, 12, 12, 10, 12] },
        { name: "Notes", aoa: notes, widths: [12, 22, 12, 22, 34] },
      ],
      `butcher_reports_${from || "all"}_${to || "all"}.xlsx`
    );
  };

  /* ── PDF: ملخّص + يومي + منتجات + تجميع + ملاحظات (إنجليزي) ── */
  const exportPdf = async () => {
    const blocks = [
      {
        title: "Summary",
        head: ["Metric", "Value"],
        rows: [
          ["Records", String(stats.count)],
          ["Butchers", String(stats.butchers)],
          ["Recipes used", String(stats.boms)],
          ["Raw material (kg)", kg(stats.carcassKg)],
          ["Products (kg)", kg(stats.cutsKg)],
          ["Waste (kg)", kg(stats.wasteKg)],
          ["Net yield %", stats.yieldPct.toFixed(1)],
          ["Waste %", stats.wastePct.toFixed(1)],
          ["Avg raw per job (kg)", kg(stats.avgCarcass)],
        ],
        columnStyles: { 1: { halign: "right" } },
      },
      {
        title: "By date",
        head: ["Date", "Jobs", "Raw kg", "Products", "Waste", "Yield %", "Waste %"],
        rows: byDay.map((d) => [
          d.day, d.count, kg(d.carcassKg), kg(d.cutsKg), kg(d.wasteKg),
          d.yieldPct.toFixed(1), d.wastePct.toFixed(1),
        ]),
        columnStyles: {
          1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" },
          4: { halign: "right" }, 5: { halign: "right" }, 6: { halign: "right" },
        },
      },
      {
        title: "Products vs recipe targets",
        head: ["Product", "Code", "Lines", "Actual kg", "Target kg", "Delta %", "% of raw"],
        rows: products.map((p) => [
          p.name, p.sku || "-", p.n, kg(p.actual), p.target ? kg(p.target) : "-",
          p.deltaPct === null ? "-" : `${p.deltaPct > 0 ? "+" : ""}${p.deltaPct.toFixed(1)}`,
          p.share.toFixed(1),
        ]),
        columnStyles: {
          2: { halign: "right" }, 3: { halign: "right" }, 4: { halign: "right" },
          5: { halign: "right" }, 6: { halign: "right" },
        },
      },
      {
        title: `Grouped by ${GROUPS.find((g) => g.id === groupKey)?.en || groupKey}`,
        head: [
          GROUPS.find((g) => g.id === groupKey)?.en || groupKey,
          "Records", "Raw kg", "Products", "Waste", "Yield %",
        ],
        rows: groups.map((g) => [
          g.key, g.count, kg(g.carcassKg), kg(g.cutsKg), kg(g.wasteKg), g.yieldPct.toFixed(1),
        ]),
        columnStyles: {
          1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" },
          4: { halign: "right" }, 5: { halign: "right" },
        },
      },
    ];

    if (issues.length) {
      blocks.push({
        title: "Notes",
        head: ["Date", "Butcher", "Recipe", "Issue", "Detail"],
        rows: issues.slice(0, 200).map((x) => [x.day, x.who, x.ref || "-", x.kind, x.detail]),
      });
    }

    await downloadPdf({
      title: "BUTCHER CUTTING REPORT",
      meta: [
        `Period: ${from || "all"} to ${to || "all"}`,
        branch ? `Butchery: ${branch}` : "All butcheries",
        `Records: ${stats.count}`,
        `Printed: ${new Date().toLocaleString("en-GB")}`,
      ],
      blocks,
      filename: `butcher_reports_${from || "all"}_${to || "all"}.pdf`,
    });
  };

  if (!canOpenButcherPage("butcher.view")) return <NoAccess page="butcher.view" />;

  return (
    <div dir={dir} className="bk bk-page" style={S.page}>
      <style>{KIT_CSS}</style>
      <div style={S.wrap}>
        <PageHead
          icon="📋"
          title={t({ en: "Butcher Reports", ar: "تقارير الجزار" })}
          sub={t({
            en: "Every cutting execution — actual weights against the recipe targets.",
            ar: "كل تنفيذ تقطيع — الأوزان الفعلية مقابل أهداف الوصفة.",
          })}
        >
          <LangToggle lang={lang} toggle={toggle} style={{ ...S.btn, ...S.btnSm }} />
          <button type="button" style={{ ...S.btn, ...S.btnSm }} onClick={reload}>
            ↻ {t({ en: "Refresh", ar: "تحديث" })}
          </button>
          <button type="button" style={{ ...S.btn, ...S.btnSm }} onClick={() => window.print()}>
            🖨 {t({ en: "Print", ar: "طباعة" })}
          </button>
          <button
            type="button"
            style={{ ...S.btn, ...S.btnSm }}
            onClick={exportPdf}
            disabled={!rows.length}
          >
            ⬇ PDF
          </button>
          <button
            type="button"
            style={{ ...S.btn, ...S.btnSm, ...S.btnPrimary }}
            onClick={exportExcel}
            disabled={!rows.length}
          >
            ⬇ Excel
          </button>
          <button type="button" style={{ ...S.btn, ...S.btnSm }} onClick={() => navigate("/butcher")}>
            ← {t({ en: "Back", ar: "رجوع" })}
          </button>
        </PageHead>

        {/* ══ الفلاتر ══ */}
        <Card
          icon="🔎"
          title={t({ en: "Filters", ar: "الفلاتر" })}
          sub={activeFilters
            ? t({ en: `${activeFilters} active`, ar: `${activeFilters} فلتر مفعّل` })
            : t({ en: "Narrow the data down", ar: "ضيّق نطاق البيانات" })}
          actions={
            <div style={{ display: "flex", gap: 8, marginInlineStart: "auto", flexWrap: "wrap" }}>
              {[
                { lbl: t({ en: "Today", ar: "اليوم" }), a: todayStr(), b: todayStr() },
                { lbl: t({ en: "7 days", ar: "٧ أيام" }), a: shiftDays(-6), b: todayStr() },
                { lbl: t({ en: "30 days", ar: "٣٠ يوم" }), a: shiftDays(-29), b: todayStr() },
                { lbl: t({ en: "This month", ar: "هذا الشهر" }), a: monthStart(), b: todayStr() },
              ].map((p) => (
                <button
                  key={p.lbl}
                  type="button"
                  style={{
                    ...S.btn, ...S.btnSm,
                    ...(from === p.a && to === p.b ? S.btnPrimary : null),
                  }}
                  onClick={() => { setFrom(p.a); setTo(p.b); }}
                >
                  {p.lbl}
                </button>
              ))}
              <button type="button" style={{ ...S.btn, ...S.btnSm }} onClick={resetAll}>
                ✕ {t({ en: "Clear", ar: "مسح" })}
              </button>
            </div>
          }
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
                <option value="">{t({ en: "All", ar: "الكل" })}</option>
                {BRANCHES.map((b) => (
                  <option key={b.code} value={b.code}>{nameOf(b, isAr)}</option>
                ))}
              </select>
            </label>
            <label style={S.label}>
              <span className="bk-lbl" style={{ color: C.muted }}>{t({ en: "Category", ar: "الفئة" })}</span>
              <select value={catId} onChange={(e) => setCatId(e.target.value)} style={S.input}>
                <option value="">{t({ en: "All", ar: "الكل" })}</option>
                {catOptions.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
            <label style={S.label}>
              <span className="bk-lbl" style={{ color: C.muted }}>{t({ en: "Recipe", ar: "الوصفة" })}</span>
              <select value={bomRef} onChange={(e) => setBomRef(e.target.value)} style={S.input}>
                <option value="">{t({ en: "All", ar: "الكل" })}</option>
                {bomOptions.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </label>
            <label style={S.label}>
              <span className="bk-lbl" style={{ color: C.muted }}>{t({ en: "Status", ar: "الحالة" })}</span>
              <select value={review} onChange={(e) => setReview(e.target.value)} style={S.input}>
                <option value="">{t({ en: "All", ar: "الكل" })}</option>
                <option value="pending">{t({ en: "Pending", ar: "قيد المراجعة" })}</option>
                <option value="approved">{t({ en: "Approved", ar: "معتمد" })}</option>
                <option value="rejected">{t({ en: "Rejected", ar: "مرفوض" })}</option>
              </select>
            </label>
            <label style={{ ...S.label, gridColumn: "span 2" }}>
              <span className="bk-lbl" style={{ color: C.muted }}>
                {t({ en: "Search", ar: "بحث" })}
              </span>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t({
                  en: "Butcher, recipe, product, code…",
                  ar: "جزار، وصفة، منتج، كود…",
                })}
                style={S.input}
              />
            </label>
            <label style={{ ...S.label, justifyContent: "end" }}>
              <span className="bk-chip" style={{
                ...S.chip, cursor: "pointer",
                ...(onlyDeviating ? { background: "#fee2e2", color: "#991b1b" } : null),
              }}
                onClick={() => setOnlyDeviating((v) => !v)}
              >
                <input type="checkbox" checked={onlyDeviating} readOnly style={{ pointerEvents: "none" }} />
                ⚠️ {t({ en: "Deviating only", ar: "المنحرف فقط" })}
              </span>
            </label>
          </div>
        </Card>

        {/* ══ المؤشّرات ══ */}
        <div className="bk-kpis" style={S.kpiGrid}>
          <Kpi label={t({ en: "Records", ar: "السجلات" })} value={stats.count} color={C.blue}
            hint={t({ en: `${stats.butchers} butchers`, ar: `${stats.butchers} جزار` })} />
          <Kpi label={t({ en: "Raw material", ar: "المادة الخام" })} value={kg(stats.carcassKg)} unit="kg" color={C.blueDk}
            hint={t({ en: `avg ${kg(stats.avgCarcass)}`, ar: `متوسط ${kg(stats.avgCarcass)}` })} />
          <Kpi label={t({ en: "Products", ar: "النواتج" })} value={kg(stats.cutsKg)} unit="kg" color={C.teal} />
          <Kpi label={t({ en: "Waste", ar: "الهدر" })} value={kg(stats.wasteKg)} unit="kg" color={C.amber} />
          <Kpi label={t({ en: "Net yield", ar: "نسبة التصافي" })} value={stats.yieldPct.toFixed(1)} unit="%" color={C.green} />
          <Kpi label={t({ en: "Waste %", ar: "نسبة الهدر" })} value={stats.wastePct.toFixed(1)} unit="%" color={C.red} />
          <Kpi label={t({ en: "Recipes used", ar: "وصفات مستعملة" })} value={stats.boms} color={C.violet}
            hint={stats.pieces ? t({ en: `${stats.pieces} pieces`, ar: `${stats.pieces} قطعة` }) : ""} />
        </div>

        <ErrorNote error={error} t={t} onRetry={reload} />

        {truncated && (
          <div style={{ ...S.card, background: "#fff7ed", borderColor: "#fcd9a4", color: "#8a5a12", fontWeight: 800 }}>
            ⚠️ {t({
              en: "This period has more records than one page can hold, so the oldest are not included. Narrow the date range for complete figures.",
              ar: "هذه الفترة فيها سجلات أكثر مما يُحمَّل دفعة واحدة، فالأقدم غير محسوب. ضيّق المدى للحصول على أرقام كاملة.",
            })}
          </div>
        )}

        {loading ? (
          <Card><Skeleton rows={8} /></Card>
        ) : !rows.length ? (
          <Card>
            <EmptyBox>
              {t({
                en: "No records match these filters.",
                ar: "لا توجد سجلات مطابقة لهذه الفلاتر.",
              })}
            </EmptyBox>
          </Card>
        ) : (
          <>
            {/* ══ أداء المنتجات مقابل أهداف الوصفة ══ */}
            <Card
              icon="🎯"
              title={t({ en: "Products vs recipe targets", ar: "المنتجات مقابل أهداف الوصفة" })}
              sub={t({
                en: "Where the actual cutting drifts from what the recipe expects.",
                ar: "وين التقطيع الفعلي بينحرف عن اللي بتتوقّعه الوصفة.",
              })}
            >
              <div className="bk-tablewrap" style={S.tableWrap}>
                <table style={S.table}>
                  <thead>
                    <tr>
                      <th style={S.th}>{t({ en: "Product", ar: "المنتج" })}</th>
                      <th style={S.th}>{t({ en: "Code", ar: "الكود" })}</th>
                      <th style={{ ...S.th, textAlign: "end" }}>{t({ en: "Actual", ar: "الفعلي" })}</th>
                      <th style={{ ...S.th, textAlign: "end" }}>{t({ en: "Target", ar: "المستهدف" })}</th>
                      <th style={{ ...S.th, textAlign: "end" }}>{t({ en: "Delta", ar: "الانحراف" })}</th>
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
                        <td style={{ ...S.td, ...S.tdNum }}>{kg(p.actual)}</td>
                        <td style={{ ...S.td, ...S.tdNum, color: C.muted }}>
                          {p.target ? kg(p.target) : "—"}
                        </td>
                        <td style={{ ...S.td, ...S.tdNum }}><DeltaCell value={p.deltaPct} /></td>
                        <td style={S.td}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <MiniBar value={p.share} max={100}
                              color={p.isWaste ? C.amber : C.teal} />
                            <span style={{ fontWeight: 800, minWidth: 52 }}>{p.share.toFixed(1)}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* ══ حسب اليوم ══ */}
            <Card
              icon="📆"
              title={t({ en: "By date", ar: "حسب التاريخ" })}
              sub={t({
                en: "Daily volume and yield across the selected period.",
                ar: "الحجم والتصافي اليومي عبر الفترة المختارة.",
              })}
            >
              <div className="bk-tablewrap" style={S.tableWrap}>
                <table style={S.table}>
                  <thead>
                    <tr>
                      <th style={S.th}>{t({ en: "Date", ar: "التاريخ" })}</th>
                      <th style={{ ...S.th, textAlign: "end" }}>{t({ en: "Jobs", ar: "التنفيذات" })}</th>
                      <th style={{ ...S.th, textAlign: "end" }}>{t({ en: "Raw kg", ar: "الخام" })}</th>
                      <th style={{ ...S.th, textAlign: "end" }}>{t({ en: "Products", ar: "النواتج" })}</th>
                      <th style={{ ...S.th, textAlign: "end" }}>{t({ en: "Waste", ar: "الهدر" })}</th>
                      <th style={S.th}>{t({ en: "Yield", ar: "التصافي" })}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byDay.map((d) => (
                      <tr key={d.day}>
                        <td style={{ ...S.td, fontWeight: 900 }}>{d.day}</td>
                        <td style={{ ...S.td, ...S.tdNum }}>{d.count}</td>
                        <td style={{ ...S.td, ...S.tdNum }}>{kg(d.carcassKg)}</td>
                        <td style={{ ...S.td, ...S.tdNum, color: C.teal }}>{kg(d.cutsKg)}</td>
                        <td style={{ ...S.td, ...S.tdNum, color: C.amber }}>{kg(d.wasteKg)}</td>
                        <td style={S.td}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <MiniBar value={d.yieldPct} max={100} color={C.green} />
                            <span style={{ fontWeight: 900, color: C.green, minWidth: 52 }}>
                              {d.yieldPct.toFixed(1)}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* ══ الملاحظات ══ */}
            {issues.length > 0 && (
              <Card
                icon="⚠️"
                title={t({ en: "Notes & data quality", ar: "الملاحظات وجودة البيانات" })}
                sub={t({
                  en: `${issues.length} item(s) worth a look`,
                  ar: `${issues.length} بند بحاجة نظرة`,
                })}
              >
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
                      {issues.slice(0, 60).map((x, i) => (
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
              </Card>
            )}

            {/* ══ التجميع ══ */}
            <Card
              icon="📊"
              title={t({ en: "Grouped view", ar: "عرض مجمّع" })}
              actions={
                <select
                  value={groupKey}
                  onChange={(e) => setGroupKey(e.target.value)}
                  style={{ ...S.input, width: "auto", marginInlineStart: "auto" }}
                >
                  {GROUPS.map((g) => (
                    <option key={g.id} value={g.id}>{isAr ? g.ar : g.en}</option>
                  ))}
                </select>
              }
            >
              <div className="bk-tablewrap" style={S.tableWrap}>
                <table style={S.table}>
                  <thead>
                    <tr>
                      <th style={S.th}>{GROUPS.find((g) => g.id === groupKey)?.[isAr ? "ar" : "en"]}</th>
                      <th style={{ ...S.th, textAlign: "end" }}>{t({ en: "Records", ar: "السجلات" })}</th>
                      <th style={{ ...S.th, textAlign: "end" }}>{t({ en: "Raw kg", ar: "الخام" })}</th>
                      <th style={{ ...S.th, textAlign: "end" }}>{t({ en: "Products", ar: "النواتج" })}</th>
                      <th style={{ ...S.th, textAlign: "end" }}>{t({ en: "Waste", ar: "الهدر" })}</th>
                      <th style={S.th}>{t({ en: "Yield", ar: "التصافي" })}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groups.map((g) => (
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

            {/* ══ السجلات ══ */}
            <Card
              icon="🧾"
              title={t({ en: "Records", ar: "السجلات" })}
              sub={t({
                en: "Click a row to open its full cutting breakdown.",
                ar: "اضغط على أي سطر لفتح تفاصيل تقطيعه كاملة.",
              })}
              actions={
                <div style={{ display: "flex", gap: 8, marginInlineStart: "auto" }}>
                  {["detailed", "grouped"].map((m) => (
                    <button
                      key={m}
                      type="button"
                      style={{ ...S.btn, ...S.btnSm, ...(mode === m ? S.btnPrimary : null) }}
                      onClick={() => setMode(m)}
                    >
                      {m === "detailed"
                        ? t({ en: "Compact", ar: "مضغوط" })
                        : t({ en: "Expanded", ar: "موسّع" })}
                    </button>
                  ))}
                </div>
              }
            >
              <div className="bk-tablewrap" style={S.tableWrap}>
                <table style={S.table}>
                  <thead>
                    <tr>
                      <SortTh label={t({ en: "Cut date", ar: "تاريخ التقطيع" })} col="day" sort={sort} onSort={toggleSort} />
                      <SortTh label={t({ en: "Butcher", ar: "الجزار" })} col="employeeNo" sort={sort} onSort={toggleSort} />
                      <SortTh label={t({ en: "Recipe", ar: "الوصفة" })} col="bomRef" sort={sort} onSort={toggleSort} />
                      <SortTh label={t({ en: "Raw material", ar: "المادة الخام" })} col="inputName" sort={sort} onSort={toggleSort} />
                      <SortTh label={t({ en: "Raw kg", ar: "الخام" })} col="carcassKg" sort={sort} onSort={toggleSort} numeric />
                      <SortTh label={t({ en: "Products", ar: "النواتج" })} col="cutsKg" sort={sort} onSort={toggleSort} numeric />
                      <SortTh label={t({ en: "Waste", ar: "الهدر" })} col="wasteKg" sort={sort} onSort={toggleSort} numeric />
                      <SortTh label={t({ en: "Yield %", ar: "التصافي ٪" })} col="yieldPct" sort={sort} onSort={toggleSort} numeric />
                      <th style={S.th}>{t({ en: "Status", ar: "الحالة" })}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => {
                      const open = mode === "grouped" || openId === r.id;
                      return (
                        <React.Fragment key={r.id}>
                          <tr
                            style={{ cursor: "pointer" }}
                            onClick={() => setOpenId(openId === r.id ? "" : r.id)}
                          >
                            <td style={S.td}>
                              <b>{r.day}</b>
                              <div className="bk-lbl" style={{ color: C.muted }}>
                                {r.time} {r.entryDay && r.entryDay !== r.day
                                  ? `· ${t({ en: "entered", ar: "أُدخل" })} ${r.entryDay}` : ""}
                              </div>
                            </td>
                            <td style={S.td}>
                              {r.employeeNo}
                              <div className="bk-lbl" style={{ color: C.muted }}>{r.branchName}</div>
                            </td>
                            <td style={S.td}>
                              <Chip>{r.bomRef || "—"}</Chip>
                              {r.bomCatName && (
                                <div className="bk-lbl" style={{ color: C.muted, marginTop: 3 }}>
                                  {r.bomCatName}
                                </div>
                              )}
                            </td>
                            <td style={S.td}>
                              {r.inputName}
                              {r.inputNameAlt && (
                                <div className="bk-lbl" style={{ color: C.muted }}>{r.inputNameAlt}</div>
                              )}
                              {r.pieceCount !== null && (
                                <div className="bk-lbl" style={{ color: C.muted }}>
                                  {r.pieceCount} {t({ en: "pcs", ar: "قطعة" })}
                                </div>
                              )}
                            </td>
                            <td style={{ ...S.td, ...S.tdNum }}>{kg(r.carcassKg)}</td>
                            <td style={{ ...S.td, ...S.tdNum, color: C.teal }}>{kg(r.cutsKg)}</td>
                            <td style={{ ...S.td, ...S.tdNum, color: C.amber }}>{kg(r.wasteKg)}</td>
                            <td style={{ ...S.td, ...S.tdNum, color: C.green }}>{r.yieldPct.toFixed(1)}%</td>
                            <td style={S.td}><ReviewChip status={r.reviewStatus} t={t} /></td>
                          </tr>

                          {open && (
                            <tr>
                              <td colSpan={9} style={{ ...S.td, background: C.soft, padding: 0 }}>
                                <div style={{ padding: "12px 16px" }}>
                                  <table style={{ ...S.table, minWidth: 560 }}>
                                    <thead>
                                      <tr>
                                        <th style={S.th}>{t({ en: "Product", ar: "المنتج" })}</th>
                                        <th style={S.th}>{t({ en: "Code", ar: "الكود" })}</th>
                                        <th style={{ ...S.th, textAlign: "end" }}>{t({ en: "Actual", ar: "الفعلي" })}</th>
                                        <th style={{ ...S.th, textAlign: "end" }}>{t({ en: "Target", ar: "المستهدف" })}</th>
                                        <th style={{ ...S.th, textAlign: "end" }}>{t({ en: "Delta", ar: "الانحراف" })}</th>
                                        <th style={{ ...S.th, textAlign: "end" }}>{t({ en: "% of raw", ar: "٪ من الخام" })}</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {r.cuts.map((c, i) => (
                                        <tr key={`${r.id}_${c.itemId}_${i}`}>
                                          <td style={S.td}>
                                            {c.name}{" "}
                                            {c.isWaste && <Chip tone="amber">{t({ en: "waste", ar: "هدر" })}</Chip>}
                                            {c.nameAlt && (
                                              <div className="bk-lbl" style={{ color: C.muted }}>{c.nameAlt}</div>
                                            )}
                                          </td>
                                          <td style={{ ...S.td, color: C.muted, fontWeight: 800 }}>{c.sku || "—"}</td>
                                          <td style={{ ...S.td, ...S.tdNum }}>{kg(c.weightKg)}</td>
                                          <td style={{ ...S.td, ...S.tdNum, color: C.muted }}>
                                            {c.targetKg ? kg(c.targetKg) : "—"}
                                          </td>
                                          <td style={{ ...S.td, ...S.tdNum }}><DeltaCell value={c.deltaPct} /></td>
                                          <td style={{ ...S.td, ...S.tdNum }}>
                                            {pct(c.weightKg, r.baseKg).toFixed(1)}%
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                  {r.unaccountedKg > 0.005 && (
                                    <div className="bk-lbl" style={{ color: C.amber, marginTop: 8, fontWeight: 900 }}>
                                      ⚠️ {t({ en: "Unaccounted", ar: "فاقد غير مسجّل" })}: {kg(r.unaccountedKg)} kg
                                    </div>
                                  )}
                                  {r.review?.reason && (
                                    <div className="bk-lbl" style={{ color: C.red, marginTop: 6, fontWeight: 800 }}>
                                      {t({ en: "Rejection reason", ar: "سبب الرفض" })}: {r.review.reason}
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
