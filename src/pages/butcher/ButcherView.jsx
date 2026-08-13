// src/pages/butcher/ButcherView.jsx
//
// تقارير الجزار — فلاتر واسعة + ملخّص + تجميع + جدول + Excel + طباعة (EN/AR).
// Butcher reports viewer.
//
// السيرفر هو مصدر الحقيقة: GET /api/reports?type=butcher_cut_log
// كل سجل = ذبيحة واحدة فيها مصفوفة cuts (انظر ButcherLog.jsx)؛ نفرد كل قطعة
// كسطر. السجلات القديمة (قطعة واحدة مسطّحة، بلا ملحمة) لسّا مدعومة.

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import API_BASE from "../../config/api";
import { BRANCHES, TYPE, isSpecialCut, nameOf } from "./butcherOptions";
import {
  butcherLabel, cfgFind, cutOptions, enabledOnly, isLocked, useButcherConfig,
} from "./butcherConfig";
import { useSettingsLang, LangToggle } from "../settings/_shared/settingsI18n";
import { canOpenButcherPage, NoAccess } from "./ButcherAccess";

/* globals.css فيه `#root * {font-size:14px!important}` و`#root table * {12px}` —
   نتغلّب عليهما بكلاس أكثر تخصيصاً. */
const CSS = `
#root .bv, #root .bv * { font-size: 16px !important; }
#root .bv table, #root .bv table * { font-size: 15px !important; }
#root .bv-title { font-size: 28px !important; }
#root .bv-sub   { font-size: 14px !important; }
#root .bv-num   { font-size: 27px !important; }
#root .bv-lbl   { font-size: 14px !important; }
#root .bv thead th { position: sticky; top: 0; z-index: 3; }
#root .bv tbody tr:hover { background: #eef6ff !important; }
#root .bv-chip { font-size: 14px !important; }
@keyframes bvShimmer { 0% { background-position: -400px 0 } 100% { background-position: 400px 0 } }
#root .bv-skel {
  height: 14px; border-radius: 7px;
  background: linear-gradient(90deg,#eef4fb 25%,#f7fbff 50%,#eef4fb 75%);
  background-size: 800px 100%; animation: bvShimmer 1.2s infinite linear;
}
@media (max-width: 820px) {
  #root .bv, #root .bv * { font-size: 15px !important; }
  #root .bv table, #root .bv table * { font-size: 13px !important; }
  #root .bv-title { font-size: 21px !important; }
  #root .bv-num   { font-size: 21px !important; }
  #root .bv-lbl, #root .bv-sub { font-size: 12px !important; }
}
@media print {
  #root .bv-noprint { display: none !important; }
  #root .bv { background: #fff !important; padding: 0 !important; }
}
`;

const todayStr = () => new Date().toISOString().slice(0, 10);
const shiftDays = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};
const monthStart = () => `${new Date().toISOString().slice(0, 7)}-01`;

function toArray(data) {
  return (
    (Array.isArray(data) && data) ||
    (Array.isArray(data?.data) && data.data) ||
    (Array.isArray(data?.items) && data.items) ||
    (Array.isArray(data?.reports) && data.reports) ||
    []
  );
}

function isAdminUser() {
  try {
    const u = JSON.parse(localStorage.getItem("currentUser") || "{}");
    return !!u.isAdmin || (Array.isArray(u.permissions) && u.permissions.includes("*"));
  } catch {
    return false;
  }
}

const kg = (n) => (Number(n) || 0).toFixed(2);
const pct = (part, whole) => (whole > 0 ? (part / whole) * 100 : 0);

export default function ButcherView() {
  const navigate = useNavigate();
  const { t, isAr, dir, lang, toggle } = useSettingsLang();
  const { cfg } = useButcherConfig();
  const isAdmin = isAdminUser();

  /* القوائم من إعدادات الجزار */
  const ANIMALS = useMemo(() => enabledOnly(cfg.animals), [cfg]);
  const ORIGIN_LIST = useMemo(() => enabledOnly(cfg.origins), [cfg]);
  const ALL_CUT_OPTIONS = useMemo(() => cutOptions(cfg), [cfg]);
  const GRADE_LIST = useMemo(() => enabledOnly(cfg.grades), [cfg]);

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /* الفلاتر */
  const [from, setFrom] = useState(todayStr());
  const [to, setTo] = useState(todayStr());
  const [branch, setBranch] = useState("");
  const [emp, setEmp] = useState("");
  const [animalId, setAnimalId] = useState("");
  const [originId, setOriginId] = useState("");
  const [gradeId, setGradeId] = useState("");
  const [cutId, setCutId] = useState("");
  const [minKg, setMinKg] = useState("");
  const [maxKg, setMaxKg] = useState("");

  /* خيارات العرض */
  const [groupKey, setGroupKey] = useState("employeeNo"); // employeeNo|branch|animal|cut|day
  const [sortKey, setSortKey] = useState("newest");       // newest|weight|yield
  const [mode, setMode] = useState("detailed");           // detailed|summary

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `${API_BASE}/api/reports?type=${encodeURIComponent(TYPE)}&limit=5000`,
        { headers: { Accept: "application/json" }, cache: "no-store" }
      );
      if (!res.ok) throw new Error(`Server ${res.status}`);
      setRecords(toArray(await res.json()));
    } catch (e) {
      setError(e?.message || t({ en: "Failed to load data", ar: "تعذّر تحميل البيانات" }));
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { load(); }, [load]);

  /** الذبائح بعد فلاتر مستوى السجل. */
  const carcasses = useMemo(() => {
    const empQ = emp.trim().toLowerCase();
    const lo = Number(minKg) || 0;
    const hi = Number(maxKg) || 0;

    return records
      .map((rec) => {
        const p = rec?.payload || {};
        const day = String(p.date || p.reportDate || rec?.created_at || "").slice(0, 10);
        const iso = p.savedAt || p.reportDate || rec?.created_at;
        const d = iso ? new Date(iso) : null;
        const time = d && !Number.isNaN(d.getTime())
          ? d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
          : "";
        const branchObj = BRANCHES.find((b) => b.code === p.branch) || null;
        const animalObj = ANIMALS.find((a) => a.id === p.animalId) || null;
        const originObj = ORIGIN_LIST.find((o) => o.id === p.originId) || null;

        const cuts = (Array.isArray(p.cuts) && p.cuts.length
          ? p.cuts
          : [{ cutId: p.cutId, cut: p.cut, weightKg: p.weightKg, wasteBoneKg: p.wasteBoneKg }]
        ).map((c) => {
          const meta = cfgFind(cfg, c.cutId);
          return {
            cutId: c.cutId,
            cutName: meta ? nameOf(meta, isAr) : c.cut || "—",
            code: c.code || "",
            special: isSpecialCut(c.cutId),
            weightKg: Number(c.weightKg) || 0,
            wasteBoneKg: Number(c.wasteBoneKg) || 0,
          };
        });

        const carcassKg = Number(p.carcassWeightKg) || 0;
        const cutsKg = cuts.reduce((s, c) => s + (c.special ? 0 : c.weightKg), 0);
        const wasteKg = cuts.reduce(
          (s, c) => s + c.wasteBoneKg + (c.special ? c.weightKg : 0), 0
        );

        return {
          id: rec.id || rec._id || p.savedAt,
          rec,
          day, time,
          employeeNo: p.butcherName
            ? `${p.butcherName} (${p.employeeNo || "—"})`
            : butcherLabel(cfg, p.employeeNo),
          employeeNoRaw: String(p.employeeNo || ""),
          locked: isLocked(cfg, day),
          branchCode: p.branch || "",
          branchName: branchObj ? nameOf(branchObj, isAr) : (isAr ? p.branchAr : p.branchEn) || "—",
          animalId: p.animalId || "",
          animalName: animalObj ? nameOf(animalObj, isAr) : p.animal || "—",
          originId: p.originId || "",
          originName: originObj ? nameOf(originObj, isAr) : p.origin || "—",
          gradeId: p.gradeId || "",
          gradeName: p.gradeId
            ? nameOf(
                (cfg.grades || []).find((g) => g.id === p.gradeId) || { ar: p.grade, en: p.gradeEn },
                isAr
              ) || p.grade || "—"
            : "—",
          carcassKg, cutsKg, wasteKg, cuts,
          mode: p.mode || "whole",
          // في وضع الأجزاء لا يوجد وزن ذبيحة، فالأساس = القطع + الهدر
          baseKg: carcassKg > 0 ? carcassKg : cutsKg + wasteKg,
          yieldPct: pct(cutsKg, carcassKg > 0 ? carcassKg : cutsKg + wasteKg),
          wastePct: pct(wasteKg, carcassKg > 0 ? carcassKg : cutsKg + wasteKg),
        };
      })
      .filter((c) => {
        if (from && c.day < from) return false;
        if (to && c.day > to) return false;
        if (branch && c.branchCode !== branch) return false;
        if (empQ && !`${c.employeeNoRaw}${c.employeeNo}`.toLowerCase().includes(empQ)) return false;
        if (animalId && c.animalId !== animalId) return false;
        if (originId && c.originId !== originId) return false;
        if (gradeId && c.gradeId !== gradeId) return false;
        if (lo && c.carcassKg < lo) return false;
        if (hi && c.carcassKg > hi) return false;
        if (cutId && !c.cuts.some((x) => x.cutId === cutId)) return false;
        return true;
      })
      .sort((a, b) => {
        if (sortKey === "weight") return b.carcassKg - a.carcassKg;
        if (sortKey === "yield") return b.yieldPct - a.yieldPct;
        return `${b.day}${b.time}`.localeCompare(`${a.day}${a.time}`);
      });
  }, [records, from, to, branch, emp, animalId, originId, gradeId, cutId, minKg, maxKg, sortKey, isAr, cfg]);

  /** الأسطر المفرودة (سطر لكل قطعة) — يحترم فلتر القطعة. */
  const rows = useMemo(() => {
    const out = [];
    carcasses.forEach((c) => {
      c.cuts
        .filter((x) => !cutId || x.cutId === cutId)
        .forEach((x, i) => {
          out.push({ ...x, carcass: c, first: i === 0, pctOfCarcass: pct(x.weightKg, c.carcassKg) });
        });
    });
    return out;
  }, [carcasses, cutId]);

  /* المجاميع */
  const stats = useMemo(() => {
    const carcassKg = carcasses.reduce((s, c) => s + c.carcassKg, 0);
    const baseKg = carcasses.reduce((s, c) => s + c.baseKg, 0);
    const cutsKg = rows.reduce((s, r) => s + (r.special ? 0 : r.weightKg), 0);
    const wasteKg = rows.reduce(
      (s, r) => s + r.wasteBoneKg + (r.special ? r.weightKg : 0), 0
    );
    const butchers = new Set(carcasses.map((c) => c.employeeNo)).size;
    return {
      count: carcasses.length,
      butchers,
      carcassKg, cutsKg, wasteKg,
      yieldPct: pct(cutsKg, baseKg),
      wastePct: pct(wasteKg, baseKg),
      avgCarcass: carcasses.length ? carcassKg / carcasses.length : 0,
    };
  }, [carcasses, rows]);

  /* جدول التجميع حسب المفتاح المختار */
  const groups = useMemo(() => {
    const pick = {
      employeeNo: (c) => c.employeeNo,
      branch: (c) => c.branchName,
      animal: (c) => c.animalName,
      grade: (c) => c.gradeName,
      day: (c) => c.day,
    }[groupKey];

    const map = new Map();

    if (groupKey === "cut") {
      rows.forEach((r) => {
        const g = map.get(r.cutName) || { key: r.cutName, count: 0, carcassKg: 0, cutsKg: 0, wasteKg: 0 };
        g.count += 1;
        if (r.special) g.wasteKg += r.weightKg;
        else g.cutsKg += r.weightKg;
        g.wasteKg += r.wasteBoneKg;
        g.carcassKg += r.carcass.carcassKg;
        g.baseKg = (g.baseKg || 0) + r.carcass.baseKg;
        map.set(r.cutName, g);
      });
    } else {
      carcasses.forEach((c) => {
        const key = pick(c) || "—";
        const g = map.get(key) || { key, count: 0, carcassKg: 0, cutsKg: 0, wasteKg: 0 };
        g.count += 1;
        g.carcassKg += c.carcassKg;
        g.baseKg = (g.baseKg || 0) + c.baseKg;
        g.cutsKg += c.cutsKg;
        g.wasteKg += c.wasteKg;
        map.set(key, g);
      });
    }

    return [...map.values()]
      .map((g) => ({ ...g, yieldPct: pct(g.cutsKg, g.baseKg || g.carcassKg), wastePct: pct(g.wasteKg, g.baseKg || g.carcassKg) }))
      .sort((a, b) => b.cutsKg - a.cutsKg);
  }, [carcasses, rows, groupKey]);

  /* التقرير المجمّع بالتاريخ: صف لكل يوم، وعمود لكل قطعة ظهرت في النتائج.
     Summary of all cuttings from all transactions, by date. */
  const pivot = useMemo(() => {
    const days = new Map();
    const usedCuts = new Set();
    const seen = new Set();   // (يوم|سجل) حتى لا يتكرّر عدّ الذبيحة

    rows.forEach((r) => {
      const day = r.carcass.day || "—";
      const e = days.get(day) ||
        { day, count: 0, carcassKg: 0, cutsKg: 0, wasteKg: 0, cuts: {} };

      if (r.special) {
        e.wasteKg += r.weightKg;
      } else {
        e.cuts[r.cutId] = (e.cuts[r.cutId] || 0) + r.weightKg;
        e.cutsKg += r.weightKg;
        usedCuts.add(r.cutId);
      }
      e.wasteKg += r.wasteBoneKg;

      const key = `${day}|${r.carcass.id}`;
      if (!seen.has(key)) {
        seen.add(key);
        e.count += 1;
        e.carcassKg += r.carcass.carcassKg;
      }
      days.set(day, e);
    });

    const cols = ALL_CUT_OPTIONS.filter((c) => !isSpecialCut(c.id) && usedCuts.has(c.id));
    const list = [...days.values()].sort((a, b) => b.day.localeCompare(a.day));
    const totals = {
      count: list.reduce((s, d) => s + d.count, 0),
      carcassKg: list.reduce((s, d) => s + d.carcassKg, 0),
      cutsKg: list.reduce((s, d) => s + d.cutsKg, 0),
      wasteKg: list.reduce((s, d) => s + d.wasteKg, 0),
      cuts: cols.reduce((acc, c) => {
        acc[c.id] = list.reduce((s, d) => s + (d.cuts[c.id] || 0), 0);
        return acc;
      }, {}),
    };
    return { list, cols, totals };
  }, [rows, ALL_CUT_OPTIONS]);

  /* ── أفعال ── */

  const applyRange = (kind) => {
    if (kind === "today") { setFrom(todayStr()); setTo(todayStr()); }
    if (kind === "yesterday") { setFrom(shiftDays(-1)); setTo(shiftDays(-1)); }
    if (kind === "week") { setFrom(shiftDays(-6)); setTo(todayStr()); }
    if (kind === "month") { setFrom(monthStart()); setTo(todayStr()); }
    if (kind === "all") { setFrom(""); setTo(""); }
  };

  const resetAll = () => {
    setFrom(todayStr()); setTo(todayStr());
    setBranch(""); setEmp(""); setAnimalId(""); setOriginId(""); setGradeId(""); setCutId("");
    setMinKg(""); setMaxKg("");
    setSortKey("newest"); setMode("detailed");
  };

  const exportExcel = async () => {
    const XLSX = await import("xlsx");
    const wb = XLSX.utils.book_new();

    // ورقة التفاصيل
    const detail = [
      [
        t({ en: "Date", ar: "التاريخ" }), t({ en: "Time", ar: "الوقت" }),
        t({ en: "Branch", ar: "الملحمة" }), t({ en: "Employee", ar: "الرقم الوظيفي" }),
        t({ en: "Type", ar: "النوع" }), t({ en: "Origin", ar: "المنشأ" }),
        t({ en: "Carcass", ar: "وزن الذبيحة" }), t({ en: "Cut", ar: "القطعة" }),
        t({ en: "Item code", ar: "كود الصنف" }),
        t({ en: "Weight", ar: "الوزن" }), t({ en: "% of carcass", ar: "٪ من الذبيحة" }),
        t({ en: "Waste & bone", ar: "الهدر والعضم" }),
      ],
      ...rows.map((r) => [
        r.carcass.day, r.carcass.time, r.carcass.branchName, r.carcass.employeeNo,
        r.carcass.animalName, r.carcass.originName,
        r.first ? r.carcass.carcassKg : "",
        r.cutName, r.code || "",
        r.special ? "" : r.weightKg,
        r.special ? "" : Number(r.pctOfCarcass.toFixed(2)),
        r.special ? r.weightKg : r.wasteBoneKg,
      ]),
      [],
      ["", "", "", "", "", t({ en: "Total", ar: "الإجمالي" }),
        Number(stats.carcassKg.toFixed(2)), "", "",
        Number(stats.cutsKg.toFixed(2)),
        Number(stats.yieldPct.toFixed(2)),
        Number(stats.wasteKg.toFixed(2))],
    ];
    const ws1 = XLSX.utils.aoa_to_sheet(detail);
    ws1["!cols"] = [
      { wch: 12 }, { wch: 8 }, { wch: 22 }, { wch: 14 }, { wch: 12 },
      { wch: 12 }, { wch: 13 }, { wch: 16 }, { wch: 12 }, { wch: 11 }, { wch: 13 }, { wch: 14 },
    ];
    XLSX.utils.book_append_sheet(wb, ws1, "Detail");

    // ورقة الملخّص حسب التجميع الحالي
    const summary = [
      [
        t({ en: "Group", ar: "المجموعة" }), t({ en: "Carcasses", ar: "عدد" }),
        t({ en: "Carcass kg", ar: "وزن الذبائح" }), t({ en: "Cuts kg", ar: "القطع" }),
        t({ en: "Waste kg", ar: "الهدر والعضم" }), t({ en: "Net yield %", ar: "٪ التصافي" }),
        t({ en: "Waste %", ar: "٪ الهدر" }),
      ],
      ...groups.map((g) => [
        g.key, g.count,
        Number(g.carcassKg.toFixed(2)), Number(g.cutsKg.toFixed(2)),
        Number(g.wasteKg.toFixed(2)), Number(g.yieldPct.toFixed(2)), Number(g.wastePct.toFixed(2)),
      ]),
    ];
    const ws2 = XLSX.utils.aoa_to_sheet(summary);
    ws2["!cols"] = [{ wch: 24 }, { wch: 9 }, { wch: 13 }, { wch: 12 }, { wch: 14 }, { wch: 13 }, { wch: 11 }];
    XLSX.utils.book_append_sheet(wb, ws2, "Summary");

    // ورقة التقرير المجمّع بالتاريخ
    const byDate = [
      [
        t({ en: "Date", ar: "التاريخ" }), t({ en: "Carcasses", ar: "الذبائح" }),
        t({ en: "Carcass kg", ar: "وزن الذبائح" }),
        ...pivot.cols.map((c) => nameOf(c, isAr)),
        t({ en: "Cuts kg", ar: "مجموع القطع" }), t({ en: "Waste & bone", ar: "الهدر والعضم" }),
        t({ en: "Net yield %", ar: "٪ التصافي" }),
      ],
      ...pivot.list.map((d) => {
        const base = d.carcassKg > 0 ? d.carcassKg : d.cutsKg + d.wasteKg;
        return [
          d.day, d.count, Number(d.carcassKg.toFixed(2)),
          ...pivot.cols.map((c) => Number((d.cuts[c.id] || 0).toFixed(2))),
          Number(d.cutsKg.toFixed(2)), Number(d.wasteKg.toFixed(2)),
          Number(pct(d.cutsKg, base).toFixed(2)),
        ];
      }),
      [
        t({ en: "Total", ar: "الإجمالي" }), pivot.totals.count,
        Number(pivot.totals.carcassKg.toFixed(2)),
        ...pivot.cols.map((c) => Number((pivot.totals.cuts[c.id] || 0).toFixed(2))),
        Number(pivot.totals.cutsKg.toFixed(2)), Number(pivot.totals.wasteKg.toFixed(2)),
        Number(pct(
          pivot.totals.cutsKg,
          pivot.totals.carcassKg > 0
            ? pivot.totals.carcassKg
            : pivot.totals.cutsKg + pivot.totals.wasteKg
        ).toFixed(2)),
      ],
    ];
    const ws3 = XLSX.utils.aoa_to_sheet(byDate);
    ws3["!cols"] = [{ wch: 13 }, { wch: 10 }, { wch: 13 },
      ...pivot.cols.map(() => ({ wch: 13 })),
      { wch: 13 }, { wch: 15 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, ws3, "By Date");

    XLSX.writeFile(wb, `butcher_${from || "all"}_${to || "all"}.xlsx`);
  };

  /** الحذف يشيل الذبيحة كاملة بكل قطعها (سجل واحد على السيرفر). */
  const removeCarcass = async (c) => {
    const id = c.rec?.id || c.rec?._id;
    if (!id) return;
    if (c.locked) {
      window.alert(t({
        en: "This record is locked by the retention rule in Settings.",
        ar: "هذا السجل مقفول حسب مدة القفل في الإعدادات.",
      }));
      return;
    }
    const msg = isAr
      ? `حذف ذبيحة ${c.animalName} (${c.cuts.length} قطع) للموظف ${c.employeeNo}؟`
      : `Delete ${c.animalName} carcass (${c.cuts.length} cuts) for employee ${c.employeeNo}?`;
    if (!window.confirm(msg)) return;
    try {
      const res = await fetch(`${API_BASE}/api/reports/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(`Server ${res.status}`);
      setRecords((prev) => prev.filter((x) => (x?.id || x?._id) !== id));
    } catch (e) {
      window.alert(`${t({ en: "Delete failed", ar: "تعذّر الحذف" })}: ${e?.message || e}`);
    }
  };

  /* الفلاتر النشطة كشرائح */
  const activeChips = useMemo(() => {
    const list = [];
    const label = (k, v) => `${k}: ${v}`;
    if (branch) {
      const b = BRANCHES.find((x) => x.code === branch);
      list.push({
        key: "branch",
        label: label(t({ en: "Butchery", ar: "الملحمة" }), b ? nameOf(b, isAr) : branch),
        clear: () => setBranch(""),
      });
    }
    if (emp.trim()) {
      list.push({
        key: "emp",
        label: label(t({ en: "Employee", ar: "الرقم الوظيفي" }), emp.trim()),
        clear: () => setEmp(""),
      });
    }
    if (animalId) {
      const a = ANIMALS.find((x) => x.id === animalId);
      list.push({
        key: "animal",
        label: label(t({ en: "Type", ar: "النوع" }), a ? nameOf(a, isAr) : animalId),
        clear: () => setAnimalId(""),
      });
    }
    if (originId) {
      const o = ORIGIN_LIST.find((x) => x.id === originId);
      list.push({
        key: "origin",
        label: label(t({ en: "Origin", ar: "المنشأ" }), o ? nameOf(o, isAr) : originId),
        clear: () => setOriginId(""),
      });
    }
    if (gradeId) {
      const g = GRADE_LIST.find((x) => x.id === gradeId);
      list.push({
        key: "grade",
        label: label(t({ en: "Grade", ar: "الدرجة" }), g ? nameOf(g, isAr) : gradeId),
        clear: () => setGradeId(""),
      });
    }
    if (cutId) {
      const c = ALL_CUT_OPTIONS.find((x) => x.id === cutId);
      list.push({
        key: "cut",
        label: label(t({ en: "Cut", ar: "القطعة" }), c ? nameOf(c, isAr) : cutId),
        clear: () => setCutId(""),
      });
    }
    if (minKg) list.push({ key: "min", label: `≥ ${minKg}`, clear: () => setMinKg("") });
    if (maxKg) list.push({ key: "max", label: `≤ ${maxKg}`, clear: () => setMaxKg("") });
    return list;
  }, [branch, emp, animalId, originId, gradeId, cutId, minKg, maxKg, ANIMALS, ORIGIN_LIST, ALL_CUT_OPTIONS, GRADE_LIST, isAr, t]);

  if (!canOpenButcherPage("butcher.view")) return <NoAccess page="butcher.view" />;

  const detailCols = isAdmin ? 13 : 12;
  const summaryCols = isAdmin ? 11 : 10;

  const RANGES = [
    { id: "today", ar: "اليوم", en: "Today" },
    { id: "yesterday", ar: "أمس", en: "Yesterday" },
    { id: "week", ar: "آخر ٧ أيام", en: "Last 7 days" },
    { id: "month", ar: "هذا الشهر", en: "This month" },
    { id: "all", ar: "الكل", en: "All" },
  ];
  const GROUPS = [
    { id: "employeeNo", ar: "الجزار", en: "Butcher" },
    { id: "branch", ar: "الملحمة", en: "Branch" },
    { id: "animal", ar: "النوع", en: "Type" },
    { id: "grade", ar: "الدرجة", en: "Grade" },
    { id: "cut", ar: "القطعة", en: "Cut" },
    { id: "day", ar: "اليوم", en: "Day" },
  ];
  const SORTS = [
    { id: "newest", ar: "الأحدث", en: "Newest" },
    { id: "weight", ar: "الأثقل", en: "Heaviest" },
    { id: "yield", ar: "الأعلى تصافي", en: "Best yield" },
  ];

  return (
    <div dir={dir} className="bv" style={S.page}>
      <style>{CSS}</style>
      <div style={S.wrap}>
        <div style={S.header}>
          <div>
            <div className="bv-title" style={S.title}>
              📋 {t({ en: "Butcher Reports", ar: "تقارير الجزار" })}
            </div>
            <div className="bv-sub" style={S.sub}>
              {t({
                en: "Summary report of all cuttings from all transactions, by date",
                ar: "تقرير مجمّع لكل التقطيعات من كل المعاملات، حسب التاريخ",
              })}
            </div>
          </div>
          <div className="bv-noprint" style={S.headerBtns}>
            <LangToggle lang={lang} toggle={toggle} style={S.langBtn} />
            <button type="button" style={S.btn} onClick={load} disabled={loading}>
              {loading ? "…" : t({ en: "Refresh", ar: "تحديث" })}
            </button>
            <button type="button" style={S.btn} onClick={() => window.print()}>
              {t({ en: "Print", ar: "طباعة" })}
            </button>
            <button type="button" style={S.btn} onClick={() => navigate("/butcher")}>
              {t({ en: "Back", ar: "رجوع" })}
            </button>
          </div>
        </div>

        {/* مدد سريعة */}
        <div className="bv-noprint" style={S.pills}>
          {RANGES.map((r) => (
            <button key={r.id} type="button" style={S.pill} onClick={() => applyRange(r.id)}>
              {nameOf(r, isAr)}
            </button>
          ))}
          <button type="button" style={{ ...S.pill, ...S.pillReset }} onClick={resetAll}>
            {t({ en: "Reset", ar: "تصفير الفلاتر" })}
          </button>
        </div>

        {/* الفلاتر */}
        <div className="bv-noprint" style={S.filters}>
          <label style={S.field}>
            <span className="bv-lbl" style={S.label}>{t({ en: "From", ar: "من" })}</span>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={S.input} />
          </label>
          <label style={S.field}>
            <span className="bv-lbl" style={S.label}>{t({ en: "To", ar: "إلى" })}</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} style={S.input} />
          </label>
          <label style={S.field}>
            <span className="bv-lbl" style={S.label}>{t({ en: "Butchery", ar: "الملحمة" })}</span>
            <select value={branch} onChange={(e) => setBranch(e.target.value)} style={S.input}>
              <option value="">{t({ en: "All", ar: "الكل" })}</option>
              {BRANCHES.map((b) => (
                <option key={b.code} value={b.code}>{nameOf(b, isAr)}</option>
              ))}
            </select>
          </label>
          <label style={S.field}>
            <span className="bv-lbl" style={S.label}>{t({ en: "Employee", ar: "الرقم الوظيفي" })}</span>
            <input
              value={emp}
              onChange={(e) => setEmp(e.target.value)}
              placeholder={t({ en: "All", ar: "الكل" })}
              inputMode="numeric"
              style={S.input}
            />
          </label>
          <label style={S.field}>
            <span className="bv-lbl" style={S.label}>{t({ en: "Type", ar: "النوع" })}</span>
            <select value={animalId} onChange={(e) => setAnimalId(e.target.value)} style={S.input}>
              <option value="">{t({ en: "All", ar: "الكل" })}</option>
              {ANIMALS.map((a) => (
                <option key={a.id} value={a.id}>{nameOf(a, isAr)}</option>
              ))}
            </select>
          </label>
          <label style={S.field}>
            <span className="bv-lbl" style={S.label}>{t({ en: "Origin", ar: "المنشأ" })}</span>
            <select value={originId} onChange={(e) => setOriginId(e.target.value)} style={S.input}>
              <option value="">{t({ en: "All", ar: "الكل" })}</option>
              {ORIGIN_LIST.map((o) => (
                <option key={o.id} value={o.id}>{nameOf(o, isAr)}</option>
              ))}
            </select>
          </label>
          {GRADE_LIST.length > 0 && (
            <label style={S.field}>
              <span className="bv-lbl" style={S.label}>{t({ en: "Grade", ar: "الدرجة" })}</span>
              <select value={gradeId} onChange={(e) => setGradeId(e.target.value)} style={S.input}>
                <option value="">{t({ en: "All", ar: "الكل" })}</option>
                {GRADE_LIST.map((g) => (
                  <option key={g.id} value={g.id}>{nameOf(g, isAr)}</option>
                ))}
              </select>
            </label>
          )}
          <label style={S.field}>
            <span className="bv-lbl" style={S.label}>{t({ en: "Cut", ar: "القطعة" })}</span>
            <select value={cutId} onChange={(e) => setCutId(e.target.value)} style={S.input}>
              <option value="">{t({ en: "All", ar: "الكل" })}</option>
              {ALL_CUT_OPTIONS.map((c) => (
                <option key={c.id} value={c.id}>{nameOf(c, isAr)}</option>
              ))}
            </select>
          </label>
          <label style={S.field}>
            <span className="bv-lbl" style={S.label}>{t({ en: "Carcass ≥", ar: "وزن الذبيحة ≥" })}</span>
            <input value={minKg} onChange={(e) => setMinKg(e.target.value)} inputMode="decimal" placeholder="0" style={S.input} />
          </label>
          <label style={S.field}>
            <span className="bv-lbl" style={S.label}>{t({ en: "Carcass ≤", ar: "وزن الذبيحة ≤" })}</span>
            <input value={maxKg} onChange={(e) => setMaxKg(e.target.value)} inputMode="decimal" placeholder="∞" style={S.input} />
          </label>
          <label style={S.field}>
            <span className="bv-lbl" style={S.label}>{t({ en: "Group by", ar: "تجميع حسب" })}</span>
            <select value={groupKey} onChange={(e) => setGroupKey(e.target.value)} style={S.input}>
              {GROUPS.map((g) => (
                <option key={g.id} value={g.id}>{nameOf(g, isAr)}</option>
              ))}
            </select>
          </label>
          <label style={S.field}>
            <span className="bv-lbl" style={S.label}>{t({ en: "Sort", ar: "الترتيب" })}</span>
            <select value={sortKey} onChange={(e) => setSortKey(e.target.value)} style={S.input}>
              {SORTS.map((s) => (
                <option key={s.id} value={s.id}>{nameOf(s, isAr)}</option>
              ))}
            </select>
          </label>
          <label style={S.field}>
            <span className="bv-lbl" style={S.label}>{t({ en: "View", ar: "طريقة العرض" })}</span>
            <select value={mode} onChange={(e) => setMode(e.target.value)} style={S.input}>
              <option value="detailed">{t({ en: "Detailed (per cut)", ar: "مفصّل (لكل قطعة)" })}</option>
              <option value="summary">{t({ en: "Summary (per carcass)", ar: "ملخّص (لكل ذبيحة)" })}</option>
            </select>
          </label>
          <div style={S.filterBtns}>
            <button
              type="button"
              style={{ ...S.btn, ...S.btnPrimary, ...(carcasses.length ? null : S.btnOff) }}
              onClick={exportExcel}
              disabled={!carcasses.length}
            >
              Excel
            </button>
          </div>
        </div>

        {/* شرائح الفلاتر النشطة — اضغط × لإزالة أي فلتر */}
        {activeChips.length > 0 && (
          <div className="bv-noprint" style={S.chips}>
            {activeChips.map((c) => (
              <span key={c.key} className="bv-chip" style={S.chip}>
                {c.label}
                <button type="button" style={S.chipX} onClick={c.clear} aria-label="remove">×</button>
              </span>
            ))}
            <button type="button" className="bv-chip" style={S.chipClear} onClick={resetAll}>
              {t({ en: "Clear all", ar: "مسح الكل" })}
            </button>
          </div>
        )}

        {error && <div style={S.error}>{error}</div>}

        {/* الملخّص */}
        <div style={S.stats}>
          <Stat num={stats.count} lbl={t({ en: "Carcasses", ar: "عدد الذبائح" })} />
          <Stat num={stats.butchers} lbl={t({ en: "Butchers", ar: "عدد الجزارين" })} />
          <Stat num={kg(stats.carcassKg)} lbl={t({ en: "Carcass kg", ar: "وزن قبل التقطيع" })} />
          <Stat num={kg(stats.cutsKg)} lbl={t({ en: "Cuts kg", ar: "إجمالي القطع" })} />
          <Stat num={kg(stats.wasteKg)} lbl={t({ en: "Waste & bone", ar: "الهدر والعضم" })} color="#a16207" />
          <Stat num={`${stats.yieldPct.toFixed(1)}%`} lbl={t({ en: "Net yield", ar: "نسبة التصافي" })} color="#0f766e" />
          <Stat num={`${stats.wastePct.toFixed(1)}%`} lbl={t({ en: "Waste %", ar: "نسبة الهدر" })} color="#a16207" />
          <Stat num={kg(stats.avgCarcass)} lbl={t({ en: "Avg carcass", ar: "متوسط الذبيحة" })} />
        </div>

        {/* التقرير المجمّع بالتاريخ — كل التقطيعات من كل المعاملات */}
        <div style={S.tableWrap}>
          <div style={S.blockTitle}>
            🗓️ {t({
              en: "Summary of all cuttings by date",
              ar: "تقرير مجمّع لكل التقطيعات حسب التاريخ",
            })}
          </div>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.thSticky}>{t({ en: "Date", ar: "التاريخ" })}</th>
                <th style={S.th}>{t({ en: "Carcasses", ar: "الذبائح" })}</th>
                <th style={S.th}>{t({ en: "Carcass kg", ar: "وزن الذبائح" })}</th>
                {pivot.cols.map((c) => (
                  <th key={c.id} style={S.th}>{nameOf(c, isAr)}</th>
                ))}
                <th style={S.th}>{t({ en: "Cuts kg", ar: "مجموع القطع" })}</th>
                <th style={S.th}>{t({ en: "Waste & bone", ar: "الهدر والعضم" })}</th>
                <th style={S.th}>{t({ en: "Net yield", ar: "٪ التصافي" })}</th>
              </tr>
            </thead>
            <tbody>
              {pivot.list.length === 0 && (
                <tr>
                  <td style={S.empty} colSpan={pivot.cols.length + 6}>
                    {t({ en: "No data.", ar: "لا توجد بيانات." })}
                  </td>
                </tr>
              )}
              {pivot.list.map((d) => {
                const base = d.carcassKg > 0 ? d.carcassKg : d.cutsKg + d.wasteKg;
                return (
                  <tr key={d.day}>
                    <td style={{ ...S.tdSticky, fontWeight: 800 }}>{d.day}</td>
                    <td style={S.td}>{d.count}</td>
                    <td style={S.td}>{kg(d.carcassKg)}</td>
                    {pivot.cols.map((c) => (
                      <td key={c.id} style={S.td}>
                        {d.cuts[c.id] ? kg(d.cuts[c.id]) : "—"}
                      </td>
                    ))}
                    <td style={{ ...S.td, fontWeight: 800, color: "#1f6fd0" }}>{kg(d.cutsKg)}</td>
                    <td style={{ ...S.td, color: "#a16207" }}>{kg(d.wasteKg)}</td>
                    <td style={{ ...S.td, color: "#0f766e", fontWeight: 800 }}>
                      {pct(d.cutsKg, base).toFixed(1)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {pivot.list.length > 0 && (
              <tfoot>
                <tr>
                  <td style={S.tfoot}>{t({ en: "Total", ar: "الإجمالي" })}</td>
                  <td style={S.tfoot}>{pivot.totals.count}</td>
                  <td style={S.tfoot}>{kg(pivot.totals.carcassKg)}</td>
                  {pivot.cols.map((c) => (
                    <td key={c.id} style={S.tfoot}>{kg(pivot.totals.cuts[c.id])}</td>
                  ))}
                  <td style={{ ...S.tfoot, color: "#1f6fd0" }}>{kg(pivot.totals.cutsKg)}</td>
                  <td style={{ ...S.tfoot, color: "#a16207" }}>{kg(pivot.totals.wasteKg)}</td>
                  <td style={{ ...S.tfoot, color: "#0f766e" }}>
                    {pct(
                      pivot.totals.cutsKg,
                      pivot.totals.carcassKg > 0
                        ? pivot.totals.carcassKg
                        : pivot.totals.cutsKg + pivot.totals.wasteKg
                    ).toFixed(1)}%
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* جدول التجميع */}
        <div style={S.tableWrap}>
          <div style={S.blockTitle}>
            {t({ en: "Breakdown by", ar: "تجميع حسب" })}{" "}
            {nameOf(GROUPS.find((g) => g.id === groupKey), isAr)}
          </div>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>{nameOf(GROUPS.find((g) => g.id === groupKey), isAr)}</th>
                <th style={S.th}>{t({ en: "Count", ar: "العدد" })}</th>
                <th style={S.th}>{t({ en: "Carcass kg", ar: "وزن الذبائح" })}</th>
                <th style={S.th}>{t({ en: "Cuts kg", ar: "القطع" })}</th>
                <th style={S.th}>{t({ en: "Waste kg", ar: "الهدر والعضم" })}</th>
                <th style={S.th}>{t({ en: "Net yield", ar: "٪ التصافي" })}</th>
                <th style={S.th}>{t({ en: "Waste %", ar: "٪ الهدر" })}</th>
              </tr>
            </thead>
            <tbody>
              {groups.length === 0 && (
                <tr><td style={S.empty} colSpan={7}>{t({ en: "No data.", ar: "لا توجد بيانات." })}</td></tr>
              )}
              {groups.map((g) => (
                <tr key={g.key}>
                  <td style={{ ...S.td, fontWeight: 800 }}>{g.key}</td>
                  <td style={S.td}>{g.count}</td>
                  <td style={S.td}>{kg(g.carcassKg)}</td>
                  <td style={{ ...S.td, color: "#1f6fd0", fontWeight: 800 }}>{kg(g.cutsKg)}</td>
                  <td style={{ ...S.td, color: "#a16207" }}>{kg(g.wasteKg)}</td>
                  <td style={{ ...S.td, color: "#0f766e", fontWeight: 800 }}>{g.yieldPct.toFixed(1)}%</td>
                  <td style={{ ...S.td, color: "#a16207" }}>{g.wastePct.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* الجدول الرئيسي */}
        <div style={S.tableWrap}>
          <div style={S.blockTitle}>
            {mode === "detailed"
              ? t({ en: "Detailed rows (per cut)", ar: "التفاصيل (سطر لكل قطعة)" })
              : t({ en: "Carcasses", ar: "الذبائح" })}
          </div>
          <table style={S.table}>
            <thead>
              {mode === "detailed" ? (
                <tr>
                  <th style={S.th}>{t({ en: "Date", ar: "التاريخ" })}</th>
                  <th style={S.th}>{t({ en: "Time", ar: "الوقت" })}</th>
                  <th style={S.th}>{t({ en: "Butchery", ar: "الملحمة" })}</th>
                  <th style={S.th}>{t({ en: "Employee", ar: "الرقم الوظيفي" })}</th>
                  <th style={S.th}>{t({ en: "Type", ar: "النوع" })}</th>
                  <th style={S.th}>{t({ en: "Origin", ar: "المنشأ" })}</th>
                  <th style={S.th}>{t({ en: "Carcass", ar: "وزن الذبيحة" })}</th>
                  <th style={S.th}>{t({ en: "Cut", ar: "القطعة" })}</th>
                  <th style={S.th}>{t({ en: "Item code", ar: "كود الصنف" })}</th>
                  <th style={S.th}>{t({ en: "Weight", ar: "الوزن" })}</th>
                  <th style={S.th}>{t({ en: "% of carcass", ar: "٪ من الذبيحة" })}</th>
                  <th style={S.th}>{t({ en: "Waste & bone", ar: "الهدر والعضم" })}</th>
                  {isAdmin && <th style={S.th}></th>}
                </tr>
              ) : (
                <tr>
                  <th style={S.th}>{t({ en: "Date", ar: "التاريخ" })}</th>
                  <th style={S.th}>{t({ en: "Time", ar: "الوقت" })}</th>
                  <th style={S.th}>{t({ en: "Butchery", ar: "الملحمة" })}</th>
                  <th style={S.th}>{t({ en: "Employee", ar: "الرقم الوظيفي" })}</th>
                  <th style={S.th}>{t({ en: "Type", ar: "النوع" })}</th>
                  <th style={S.th}>{t({ en: "Origin", ar: "المنشأ" })}</th>
                  <th style={S.th}>{t({ en: "Carcass", ar: "وزن الذبيحة" })}</th>
                  <th style={S.th}>{t({ en: "Cuts kg", ar: "القطع" })}</th>
                  <th style={S.th}>{t({ en: "Waste kg", ar: "الهدر والعضم" })}</th>
                  <th style={S.th}>{t({ en: "Net yield", ar: "٪ التصافي" })}</th>
                  {isAdmin && <th style={S.th}></th>}
                </tr>
              )}
            </thead>
            <tbody>
              {loading && [...Array(5)].map((_, i) => (
                <tr key={`sk${i}`}>
                  <td style={S.td} colSpan={mode === "detailed" ? detailCols : summaryCols}>
                    <div className="bv-skel" style={{ width: `${92 - i * 9}%` }} />
                  </td>
                </tr>
              ))}
              {!loading && carcasses.length === 0 && (
                <tr><td style={S.empty} colSpan={mode === "detailed" ? detailCols : summaryCols}>
                  {t({ en: "No records for this filter.", ar: "لا توجد تسجيلات ضمن هذا الفلتر." })}
                </td></tr>
              )}

              {!loading && mode === "detailed" && rows.map((r, i) => (
                <tr key={`${r.carcass.id}-${r.cutId}-${i}`} style={r.first ? S.trFirst : null}>
                  <td style={S.td}>{r.first ? r.carcass.day : ""}</td>
                  <td style={S.td}>{r.first ? r.carcass.time : ""}</td>
                  <td style={S.td}>{r.first ? r.carcass.branchName : ""}</td>
                  <td style={{ ...S.td, fontWeight: 800 }}>{r.first ? r.carcass.employeeNo : ""}</td>
                  <td style={S.td}>{r.first ? r.carcass.animalName : ""}</td>
                  <td style={S.td}>{r.first ? r.carcass.originName : ""}</td>
                  <td style={{ ...S.td, fontWeight: 800 }}>{r.first ? kg(r.carcass.carcassKg) : ""}</td>
                  <td style={S.td}>{r.cutName}</td>
                  <td style={{ ...S.td, color: "#6b8299" }}>{r.code || "—"}</td>
                  <td style={{ ...S.td, fontWeight: 800, color: "#1f6fd0" }}>
                    {r.special ? "" : kg(r.weightKg)}
                  </td>
                  <td style={{ ...S.td, color: "#0f766e", fontWeight: 800 }}>
                    {r.special ? "" : `${r.pctOfCarcass.toFixed(1)}%`}
                  </td>
                  <td style={{ ...S.td, color: "#a16207" }}>
                    {kg(r.special ? r.weightKg : r.wasteBoneKg)}
                  </td>
                  {isAdmin && (
                    <td style={S.td}>
                      {r.first && (
                        <button type="button" className="bv-noprint" style={{ ...S.del, ...(r.carcass.locked ? S.delOff : null) }}
                          onClick={() => removeCarcass(r.carcass)}>
                          {t({ en: "Delete", ar: "حذف" })}
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}

              {!loading && mode === "summary" && carcasses.map((c) => (
                <tr key={c.id}>
                  <td style={S.td}>{c.day}</td>
                  <td style={S.td}>{c.time}</td>
                  <td style={S.td}>{c.branchName}</td>
                  <td style={{ ...S.td, fontWeight: 800 }}>{c.employeeNo}</td>
                  <td style={S.td}>{c.animalName}</td>
                  <td style={S.td}>{c.originName}</td>
                  <td style={{ ...S.td, fontWeight: 800 }}>{kg(c.carcassKg)}</td>
                  <td style={{ ...S.td, fontWeight: 800, color: "#1f6fd0" }}>{kg(c.cutsKg)}</td>
                  <td style={{ ...S.td, color: "#a16207" }}>{kg(c.wasteKg)}</td>
                  <td style={{ ...S.td, color: "#0f766e", fontWeight: 800 }}>{c.yieldPct.toFixed(1)}%</td>
                  {isAdmin && (
                    <td style={S.td}>
                      <button type="button" className="bv-noprint" style={{ ...S.del, ...(c.locked ? S.delOff : null) }}
                        onClick={() => removeCarcass(c)}>
                        {t({ en: "Delete", ar: "حذف" })}
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
            {!loading && carcasses.length > 0 && (
              <tfoot>
                <tr>
                  <td style={S.tfoot} colSpan={6}>{t({ en: "Total", ar: "الإجمالي" })}</td>
                  <td style={S.tfoot}>{kg(stats.carcassKg)}</td>
                  {mode === "detailed" && <td style={S.tfoot} colSpan={2}></td>}
                  <td style={{ ...S.tfoot, color: "#1f6fd0" }}>{kg(stats.cutsKg)}</td>
                  {mode === "detailed"
                    ? <td style={{ ...S.tfoot, color: "#0f766e" }}>{stats.yieldPct.toFixed(1)}%</td>
                    : <td style={{ ...S.tfoot, color: "#a16207" }}>{kg(stats.wasteKg)}</td>}
                  {mode === "detailed"
                    ? <td style={{ ...S.tfoot, color: "#a16207" }}>{kg(stats.wasteKg)}</td>
                    : <td style={{ ...S.tfoot, color: "#0f766e" }}>{stats.yieldPct.toFixed(1)}%</td>}
                  {isAdmin && <td style={S.tfoot}></td>}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}

function Stat({ num, lbl, color }) {
  return (
    <div style={S.stat}>
      <div className="bv-num" style={{ ...S.statNum, ...(color ? { color } : null) }}>{num}</div>
      <div className="bv-lbl" style={S.statLbl}>{lbl}</div>
    </div>
  );
}

const FONT = "Cairo, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif";

const S = {
  page: {
    minHeight: "100vh", background: "#eef4fb", fontFamily: FONT, color: "#0f2740",
    padding: "18px 14px 40px", overflowX: "hidden",
  },
  wrap: { maxWidth: "min(1900px, 97vw)", margin: "0 auto" },
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 14 },
  title: { fontWeight: 900 },
  sub: { color: "#6b8299", fontWeight: 700, marginTop: 2 },
  headerBtns: { display: "flex", gap: 8, flexWrap: "wrap" },
  langBtn: { background: "#fff", border: "1px solid #cfe0f0", color: "#1f6fd0" },
  btn: {
    border: "1px solid #cfe0f0", background: "#fff", color: "#3c5a75",
    borderRadius: 12, padding: "10px 16px", fontWeight: 700, fontFamily: FONT, cursor: "pointer",
  },
  btnPrimary: { background: "#1f6fd0", color: "#fff", border: "none" },
  btnOff: { background: "#a9c3dd", cursor: "not-allowed" },
  chips: { display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 },
  chip: {
    display: "inline-flex", alignItems: "center", gap: 8,
    background: "#dceaf8", color: "#14507f", border: "1px solid #bcd6ee",
    borderRadius: 999, padding: "6px 8px 6px 14px", fontWeight: 800,
  },
  chipX: {
    border: "none", background: "#ffffff", color: "#14507f", cursor: "pointer",
    width: 22, height: 22, borderRadius: "50%", lineHeight: 1, fontWeight: 900,
    fontFamily: FONT,
  },
  chipClear: {
    border: "1px solid #f5c2c2", background: "#fff", color: "#a12626",
    borderRadius: 999, padding: "6px 16px", fontWeight: 800, cursor: "pointer", fontFamily: FONT,
  },
  pills: { display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 },
  pill: {
    border: "1px solid #cfe0f0", background: "#fff", color: "#14507f",
    borderRadius: 999, padding: "8px 18px", fontWeight: 800, fontFamily: FONT, cursor: "pointer",
  },
  pillReset: { color: "#a12626", borderColor: "#f5c2c2" },
  filters: {
    background: "#fff", border: "1px solid #dbe6f2", borderRadius: 16,
    padding: 14, display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-end", marginBottom: 14,
  },
  field: {
    display: "flex", flexDirection: "column", gap: 5,
    minWidth: 0, flex: "1 1 150px",
  },
  label: { fontWeight: 800, color: "#6b8299" },
  input: {
    border: "1px solid #cfe0f0", borderRadius: 10, padding: "9px 10px",
    fontWeight: 700, fontFamily: FONT, color: "#0f2740",
    background: "#fff", outline: "none", width: "100%", boxSizing: "border-box",
  },
  filterBtns: { display: "flex", gap: 8, flex: "0 0 auto" },
  stats: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(150px,100%),1fr))", gap: 12, marginBottom: 14 },
  stat: { background: "#fff", border: "1px solid #dbe6f2", borderRadius: 16, padding: "14px 12px", textAlign: "center" },
  statNum: { fontWeight: 900, color: "#1f6fd0" },
  statLbl: { fontWeight: 700, color: "#6b8299", marginTop: 2 },
  tableWrap: {
    background: "#fff", border: "1px solid #dbe6f2", borderRadius: 16,
    overflowX: "auto", WebkitOverflowScrolling: "touch", marginBottom: 14,
  },
  blockTitle: { padding: "12px 14px", fontWeight: 900, color: "#14507f", borderBottom: "1px solid #eef4fa" },
  table: { width: "100%", borderCollapse: "collapse", minWidth: 900 },
  th: {
    background: "#dceaf8", color: "#14507f", fontWeight: 900,
    padding: "11px 10px", textAlign: "right", whiteSpace: "nowrap",
  },
  td: { padding: "10px", fontWeight: 600, borderTop: "1px solid #f7fafd", whiteSpace: "nowrap" },
  // عمود التاريخ يبقى ظاهراً أثناء التمرير الأفقي للجدول المحوري
  thSticky: {
    background: "#dceaf8", color: "#14507f", fontWeight: 900,
    padding: "11px 10px", textAlign: "right", whiteSpace: "nowrap",
    position: "sticky", insetInlineStart: 0, zIndex: 2,
  },
  tdSticky: {
    padding: "10px", fontWeight: 600, borderTop: "1px solid #f7fafd",
    whiteSpace: "nowrap", position: "sticky", insetInlineStart: 0,
    background: "#fff", zIndex: 1,
  },
  trFirst: { borderTop: "2px solid #dbe6f2" },
  tfoot: { padding: "11px 10px", fontWeight: 900, borderTop: "2px solid #dbe6f2", background: "#f7fbff" },
  empty: { padding: 26, textAlign: "center", color: "#6b8299", fontWeight: 700 },
  delOff: { opacity: 0.45, cursor: "not-allowed" },
  del: {
    border: "1px solid #f5c2c2", background: "#fff", color: "#a12626",
    borderRadius: 9, padding: "5px 12px", fontWeight: 700, fontFamily: FONT, cursor: "pointer",
  },
  error: {
    background: "#fdecec", border: "1px solid #f5c2c2", color: "#a12626",
    borderRadius: 12, padding: "10px 12px", fontWeight: 700, textAlign: "center", marginBottom: 12,
  },
};
