// src/pages/butcher/ButcherSettings.jsx
//
// لوحة إعدادات الجزار — الشروط والجزارون ووصفات التقطيع وترويسة التقرير.
// Butcher settings: rules, butchers, cutting templates, report header.
//
// شجرة الأصناف (ذبائح · مناشئ · درجات · قطع · أجزاء · منتجات نهائية) ما عادت
// هون — صارت كلها بالماستر ليست: /butcher/master (ButcherProductForm).
//
// كل شي بينحفظ على السيرفر (butcher_config) وبينعكس فوراً على شاشات الإدخال
// والتقارير.

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  DEFAULT_RULES, allConfigCodes, defaultConfig, duplicateTemplateNos,
  enabledOnly, mergeConfig, originsForAnimal,
  saveConfig, suggestTemplateNo, useButcherConfig,
} from "./butcherConfig";
import { branchCodeFromLabel, nameOf } from "./butcherOptions";
import { BRANCHES } from "./butcherOptions";
import API_BASE, { IMAGE_API_BASE } from "../../config/api";
import { useSettingsLang, LangToggle } from "../settings/_shared/settingsI18n";
import { canOpenButcherPage, NoAccess } from "./ButcherAccess";
import { can } from "../../utils/perms";
// سجل الموظفين المشترك — منه تُجلب أسماء الجزارين بدل الكتابة اليدوية
import { EMPLOYEES } from "../ohc/OHCUpload";

const TAB_IDS = ["rules", "butchers", "tree", "templates", "report", "admin"];

/* ══ الشروط مجمّعة بأقسام — العرض كله مبني من هون ══
   type: switch | number | select ، والمفتاح هو نفسه في cfg.rules */
const RULE_GROUPS = [
  {
    id: "validation", icon: "🛡️",
    ar: "التحقّق قبل الحفظ", en: "Validation before saving",
    arSub: "شو بيمنع حفظ سجل تقطيع غير سليم.",
    enSub: "What stops an invalid cutting record from being saved.",
    items: [
      {
        key: "blockOverCarcass", type: "switch",
        ar: "منع الحفظ إذا تجاوز مجموع القطع والهدر وزن الذبيحة",
        en: "Block saving when cuts + waste exceed the carcass weight",
        arHint: "الحماية الأساسية ضد الأوزان المستحيلة.",
        enHint: "The main guard against impossible weights.",
      },
      {
        key: "warnOutOfRange", type: "switch",
        ar: "تحذير عند وزن ذبيحة خارج المدى المتوقّع",
        en: "Warn when the carcass weight is outside the expected range",
        arHint: "المدى مأخوذ من سجل الذبيحة في الماستر ليست.",
        enHint: "The range comes from the animal record in the master list.",
      },
      {
        key: "requireWaste", type: "switch",
        ar: "إلزام إدخال الهدر (منع الصفر)",
        en: "Require a waste value (block zero)",
      },
      {
        key: "requireKnownCode", type: "switch",
        ar: "إلزام أن يكون كل كود موجوداً في قائمة الأصناف",
        en: "Every item code must exist in the item catalog",
        arHint: "بيمنع حفظ الإعدادات إذا في كود مش موجود بـ items.json.",
        enHint: "Blocks saving the settings when a code is not in items.json.",
      },
      {
        key: "uniqueTemplateNo", type: "switch",
        ar: "منع تكرار رقم وصفة التقطيع",
        en: "Cutting template numbers must be unique",
      },
    ],
  },
  {
    id: "entry", icon: "⌨️",
    ar: "شاشة الإدخال", en: "Entry screen",
    arSub: "سلوك الشاشة اللي بيشتغل عليها الجزار.",
    enSub: "How the screen behaves for the butcher.",
    items: [
      {
        key: "requireBranch", type: "switch",
        ar: "إلزام اختيار الملحمة قبل بدء الإدخال",
        en: "Require choosing a butchery before entry",
      },
      {
        key: "onScreenKeypad", type: "switch",
        ar: "لوحة أرقام على الشاشة",
        en: "On-screen number pad",
        arHint: "مناسبة لجهاز مشترك والإدخال بالقفازات.",
        enHint: "Made for a shared kiosk operated with gloves.",
      },
      {
        key: "showActualPct", type: "switch",
        ar: "إظهار النسبة الفعلية من وزن الأم تحت كل خانة",
        en: "Show the actual % of the parent under every weight box",
      },
      {
        key: "restrictButchers", type: "switch",
        ar: "قبول الأرقام الوظيفية المسجّلة فقط",
        en: "Accept registered employee numbers only",
        arHint: "السجل بتبويب «الجزارون».",
        enHint: "The register lives in the Butchers tab.",
      },
      {
        key: "allowBackdate", type: "switch",
        ar: "السماح بتسجيل تاريخ سابق",
        en: "Allow recording for an earlier date",
      },
    ],
  },
  {
    id: "weights", icon: "⚖️",
    ar: "الأوزان والتقريب", en: "Weights & rounding",
    arSub: "دقّة الأرقام المُدخلة والفرق المسموح.",
    enSub: "Precision of entered numbers and the allowed gap.",
    items: [
      {
        key: "toleranceKg", type: "number", unit: { en: "kg", ar: "كجم" },
        ar: "سماحية التقريب", en: "Rounding tolerance",
        arHint: "الفرق المسموح بين مجموع القطع ووزن الذبيحة.",
        enHint: "Allowed gap between the sum of the cuts and the carcass weight.",
      },
      {
        key: "roundTo", type: "select",
        ar: "تقريب الأوزان المُدخلة إلى", en: "Round entered weights to",
        options: [
          { v: 0, en: "No rounding", ar: "بلا تقريب" },
          { v: 0.01, label: "0.01" },
          { v: 0.05, label: "0.05" },
          { v: 0.1, label: "0.10" },
        ],
      },
    ],
  },
  {
    id: "analysis", icon: "📊",
    ar: "التحليل والانحراف", en: "Analysis & deviation",
    arSub: "متى يُعتبر التصافي ملفتاً في التقارير.",
    enSub: "When a yield counts as an outlier in the reports.",
    items: [
      {
        key: "deviationPct", type: "number", unit: { en: "pp", ar: "نقطة" },
        ar: "حدّ الانحراف", en: "Deviation threshold",
        arHint: "بالنقاط المئوية.", enHint: "In percentage points.",
      },
      {
        key: "deviationVsTarget", type: "switch",
        ar: "قياس الانحراف مقابل النسبة المرجعية بدل متوسط الفترة",
        en: "Measure deviation against the target ratio instead of the period average",
      },
    ],
  },
  {
    id: "locking", icon: "🔒",
    ar: "قفل السجلات", en: "Record locking",
    arSub: "متى يصير السجل غير قابل للتعديل.",
    enSub: "When a record becomes read-only.",
    items: [
      {
        key: "lockAfterDays", type: "number", unit: { en: "days", ar: "يوم" },
        ar: "قفل السجلات الأقدم من", en: "Lock records older than",
        arHint: "٠ = بلا قفل.", enHint: "0 = never lock.",
      },
    ],
  },
];

/* مستويات شجرة الأصناف — كلها تُدار من الماستر ليست */
const TREE_LEVELS = [
  { key: "animals",  icon: "🐑", ar: "الذبائح",           en: "Animals" },
  { key: "origins",  icon: "🌍", ar: "المناشئ",           en: "Origins" },
  { key: "grades",   icon: "🏅", ar: "الدرجات",           en: "Grades" },
  { key: "cuts",     icon: "🥩", ar: "القطع",             en: "Cuts" },
  { key: "pieces",   icon: "🍖", ar: "الأجزاء",           en: "Pieces" },
  { key: "products", icon: "📦", ar: "المنتجات النهائية", en: "Final products" },
];

const CSS = `
#root .bg, #root .bg * { font-size: 18px !important; }
#root .bg table, #root .bg table * { font-size: 17px !important; }
#root .bg table th { font-size: 16px !important; }
#root .bg-title { font-size: 34px !important; }
#root .bg-sec   { font-size: 23px !important; }
#root .bg-sub   { font-size: 15px !important; }
#root .bg-small { font-size: 15px !important; }

/* الجداول: ترويسة ثابتة، تظليل بالتناوب، وإبراز السطر تحت المؤشّر */
#root .bg table tbody tr:nth-child(even) { background: #fafcff; }
#root .bg table tbody tr:hover { background: #f2f8ff; }
#root .bg table thead th { position: sticky; top: 0; z-index: 5; }
#root .bg input:focus, #root .bg select:focus, #root .bg textarea:focus {
  border-color: #1f6fd0 !important;
  box-shadow: 0 0 0 3px rgba(31,111,208,.16);
}
#root .bg button { transition: filter .15s ease, transform .12s ease; }
#root .bg button:hover:not(:disabled) { filter: brightness(.97); }
#root .bg button:active:not(:disabled) { transform: translateY(1px); }

/* ── التخطيط: شريط أقسام جانبي + محتوى ── */
/* عرض كامل مثل باقي صفحات الجزار */
#root .bs-shell {
  display: grid; grid-template-columns: 274px minmax(0, 1fr); gap: 20px;
  align-items: start;
}
#root .bs-rail { position: sticky; top: 104px; }
#root .bs-rail button:hover { background: #f2f8ff; }

/* ── مفتاح تشغيل/إيقاف ── */
#root .bs-sw {
  position: relative; width: 54px; height: 30px; border-radius: 999px;
  border: none; background: #cbd9e8; cursor: pointer; padding: 0; flex-shrink: 0;
  transition: background .18s ease;
}
#root .bs-sw.on { background: #1f6fd0; }
#root .bs-sw:disabled { opacity: .5; cursor: not-allowed; }
#root .bs-knob {
  position: absolute; top: 3px; inset-inline-start: 3px;
  width: 24px; height: 24px; border-radius: 50%; background: #fff;
  box-shadow: 0 2px 6px rgba(15,39,64,.28); transition: inset-inline-start .18s ease;
}
#root .bs-sw.on .bs-knob { inset-inline-start: 27px; }

#root .bs-row { transition: background .14s ease; }
#root .bs-row:hover { background: #f7fbff; }
#root .bs-top { backdrop-filter: blur(8px); }

@media (max-width: 1040px) {
  #root .bs-shell { grid-template-columns: 1fr; }
  #root .bs-rail {
    position: static; display: flex; flex-direction: row; gap: 8px;
    overflow-x: auto; padding-bottom: 6px; background: transparent !important;
    border: 0 !important; box-shadow: none !important; padding-inline: 0 !important;
  }
  #root .bs-rail > button { flex: 0 0 auto; }
  #root .bs-navhint { display: none; }
}
@media (max-width: 1100px) {
  #root .bg, #root .bg * { font-size: 16px !important; }
  #root .bg table, #root .bg table * { font-size: 15px !important; }
  #root .bg-title { font-size: 26px !important; }
  #root .bg-sec   { font-size: 19px !important; }
}
@media (max-width: 820px) {
  #root .bg, #root .bg * { font-size: 15px !important; }
  #root .bg table, #root .bg table * { font-size: 14px !important; }
  #root .bg-title { font-size: 23px !important; }
  #root .bg-sec   { font-size: 18px !important; }
}
`;

function currentUser() {
  try {
    return JSON.parse(localStorage.getItem("currentUser") || "{}");
  } catch {
    return {};
  }
}

/**
 * الحفظ/الاستيراد/إرجاع الافتراضي — يحتاج صلاحية تعديل أو كتابة على قسم الجزار.
 * الفتح نفسه يحكمه canOpenButcherPage (منح صريح لصفحة butcher.settings).
 */
const canSaveSettings = () => can("butcher", "edit") || can("butcher", "write");

const numOr = (v, fallback) => {
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : fallback;
};

export default function ButcherSettings() {
  const navigate = useNavigate();
  const { t, isAr, dir, lang, toggle } = useSettingsLang();
  const { cfg, loading } = useButcherConfig();
  const catalog = useItemCatalog();   // قائمة الأصناف — للتحقّق من الأكواد قبل الحفظ

  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [codeAnimal, setCodeAnimal] = useState("");       // النوع الذي نحرّر نِسبه المرجعية
  const [ruleQ, setRuleQ] = useState("");                 // بحث داخل الشروط

  /* القسم المفتوح محفوظ بالرابط — التحديث أو زر الرجوع ما بيضيّعه */
  const [params, setParams] = useSearchParams();
  const tab = TAB_IDS.includes(params.get("tab")) ? params.get("tab") : "rules";

  /* موضع التمرير محفوظ لكل قسم — التنقّل ما بيرجّعك لأول الصفحة */
  const scrollMem = useRef({});
  const lastTab = useRef(tab);
  const goTab = (id) => {
    if (id === tab) return;
    scrollMem.current[tab] = window.scrollY;
    setParams({ tab: id }, { replace: true });
  };
  useLayoutEffect(() => {
    if (lastTab.current === tab) return;
    lastTab.current = tab;
    window.scrollTo(0, scrollMem.current[tab] || 0);
  }, [tab]);

  const readOnly = !canSaveSettings();
  const model = draft || cfg;
  const dirty = !!draft;

  /* شروط مطابقة للبحث — المجموعة تختفي إذا ما بقي فيها شي */
  const shownGroups = useMemo(() => {
    const needle = ruleQ.trim().toLowerCase();
    if (!needle) return RULE_GROUPS;
    return RULE_GROUPS
      .map((g) => ({
        ...g,
        items: g.items.filter((it) =>
          [it.ar, it.en, it.arHint, it.enHint]
            .some((v) => String(v || "").toLowerCase().includes(needle))
        ),
      }))
      .filter((g) => g.items.length > 0);
  }, [ruleQ]);

  const animalsOn = useMemo(() => enabledOnly(model.animals), [model.animals]);

  /* أول نوع متاح يصير المختار — النِّسب المرجعية بتتبع النوع */
  useEffect(() => {
    if (!animalsOn.length) return;
    if (!animalsOn.some((a) => a.id === codeAnimal)) setCodeAnimal(animalsOn[0].id);
  }, [animalsOn, codeAnimal]);

  /* ── تعديل مسوّدة ── */
  const edit = (fn) => {
    setMsg("");
    setDraft((prev) => {
      const next = JSON.parse(JSON.stringify(prev || cfg));
      fn(next);
      return next;
    });
  };

  /* ── الجزارون ── */
  const editButcher = (i, patch) =>
    edit((n) => {
      const prev = n.butchers[i] || {};
      const next = { ...prev, ...patch };
      // هيستوري: كل تغيير على الاسم/الملحمة/الحالة يُسجَّل بختم وقت ومستخدم
      const changes = Object.keys(patch).filter((k) => prev[k] !== patch[k] && k !== "history");
      if (changes.length) {
        next.history = [
          ...(prev.history || []).slice(-49),
          {
            at: new Date().toISOString(),
            by: currentUser().username || "",
            changes: changes.map((k) => ({ field: k, from: prev[k] ?? "", to: patch[k] ?? "" })),
          },
        ];
      }
      n.butchers[i] = next;
    });
  const addButcher = () =>
    edit((n) => {
      n.butchers = [
        ...(n.butchers || []),
        { empNo: "", name: "", branch: "", active: true, history: [] },
      ];
    });
  const removeButcher = (i) =>
    edit((n) => { n.butchers = n.butchers.filter((_, k) => k !== i); });

  /** تعبئة الاسم والملحمة من سجل الموظفين فور إدخال الرقم الوظيفي. */
  const fillButcherFromDirectory = (i, empNo) => {
    const rec = EMPLOYEES[String(empNo || "").trim()];
    editButcher(i, {
      empNo: String(empNo || "").trim(),
      ...(rec
        ? {
            name: rec.name || "",
            branch: branchCodeFromLabel(rec.branch) || "",
            job: rec.job || "",
          }
        : null),
    });
  };

  /* ── وصفات التقطيع (لكل وصفة رقم فريد) ── */
  const editTemplate = (id, patch) =>
    edit((n) => {
      const it = (n.templates || []).find((x) => x.id === id);
      if (it) Object.assign(it, patch);
    });
  const addTemplate = () =>
    edit((n) => {
      n.templates = [
        ...(n.templates || []),
        {
          id: `tpl_${Date.now().toString(36)}`,
          no: suggestTemplateNo(n.templates),
          ar: "", en: "",
          animalId: codeAnimal,
          originId: "",
          gradeId: "",
          lines: [],
          enabled: true,
          createdAt: new Date().toISOString(),
          createdBy: currentUser().username || "",
        },
      ];
    });
  const removeTemplate = (id) =>
    edit((n) => { n.templates = (n.templates || []).filter((x) => x.id !== id); });
  const editTemplateLine = (tplId, i, patch) =>
    edit((n) => {
      const tpl = (n.templates || []).find((x) => x.id === tplId);
      if (!tpl) return;
      tpl.lines = [...(tpl.lines || [])];
      tpl.lines[i] = { ...tpl.lines[i], ...patch };
    });
  const addTemplateLine = (tplId) =>
    edit((n) => {
      const tpl = (n.templates || []).find((x) => x.id === tplId);
      if (!tpl) return;
      tpl.lines = [...(tpl.lines || []), { itemId: "", pct: "" }];
    });
  const removeTemplateLine = (tplId, i) =>
    edit((n) => {
      const tpl = (n.templates || []).find((x) => x.id === tplId);
      if (!tpl) return;
      tpl.lines = (tpl.lines || []).filter((_, k) => k !== i);
    });

  /* ── الشروط المخصّصة ── */
  const editCustomRule = (i, patch) =>
    edit((n) => { n.customRules[i] = { ...n.customRules[i], ...patch }; });
  const addCustomRule = () =>
    edit((n) => {
      n.customRules = [
        ...(n.customRules || []),
        {
          id: `rule_${Date.now().toString(36)}`,
          ar: "", en: "", type: "toggle", value: false, enabled: true,
        },
      ];
    });
  const removeCustomRule = (i) =>
    edit((n) => { n.customRules = n.customRules.filter((_, k) => k !== i); });

  /* ── ترويسة التقرير ── */
  const editReport = (patch) => edit((n) => { n.report = { ...n.report, ...patch }; });
  const editSignature = (i, key, value) =>
    edit((n) => {
      const list = [...(n.report.signatures || [])];
      list[i] = { ...list[i], [key]: value };
      n.report.signatures = list;
    });
  const addSignature = () =>
    edit((n) => { n.report.signatures = [...(n.report.signatures || []), { en: "", ar: "" }]; });
  const removeSignature = (i) =>
    edit((n) => {
      n.report.signatures = (n.report.signatures || []).filter((_, k) => k !== i);
    });

  /* ── تحقّق قبل الحفظ: أرقام وصفات مكرّرة + أكواد خارج قائمة الأصناف ── */
  const blockers = useMemo(() => {
    const out = [];
    if (model.rules?.uniqueTemplateNo !== false) {
      const dupes = duplicateTemplateNos(model.templates);
      if (dupes.size) {
        out.push(
          t({
            en: `Duplicate cutting template numbers: ${[...dupes].join(", ")}`,
            ar: `أرقام وصفات تقطيع مكرّرة: ${[...dupes].join("، ")}`,
          })
        );
      }
    }
    (model.templates || []).forEach((x) => {
      if (!String(x.no || "").trim()) {
        out.push(t({ en: "A cutting template has no number.", ar: "في وصفة تقطيع بلا رقم." }));
      }
    });
    if (model.rules?.requireKnownCode === true && catalog.length) {
      const known = new Set(catalog.map((i) => String(i.item_code)));
      const bad = allConfigCodes(model).filter((c) => !known.has(c.code));
      if (bad.length) {
        const list = bad.slice(0, 6).map((c) => `${c.name} → ${c.code}`).join("، ");
        out.push(
          t({
            en: `${bad.length} item code(s) are not in the catalog: ${list}`,
            ar: `${bad.length} كود خارج قائمة الأصناف: ${list}`,
          })
        );
      }
    }
    return [...new Set(out)];
  }, [model, catalog, t]);

  const save = async () => {
    if (!draft || saving) return;
    if (blockers.length) {
      setMsg(`${t({ en: "Fix first", ar: "صحّح أولاً" })}: ${blockers[0]}`);
      return;
    }
    setSaving(true);
    setMsg("");
    try {
      await saveConfig(draft, currentUser().username || "");
      setDraft(null);
      setMsg(t({ en: "Saved.", ar: "تم الحفظ." }));
    } catch (e) {
      setMsg(`${t({ en: "Save failed", ar: "فشل الحفظ" })}: ${e?.message || e}`);
    } finally {
      setSaving(false);
    }
  };

  /* Ctrl/⌘+S يحفظ · وتحذير قبل مغادرة الصفحة وفي تعديل غير محفوظ */
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && String(e.key).toLowerCase() === "s") {
        e.preventDefault();
        if (!readOnly && dirty && !saving && !blockers.length) save();
      }
    };
    const onLeave = (e) => {
      if (!dirty) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("beforeunload", onLeave);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("beforeunload", onLeave);
    };
  });

  /** تفريغ شجرة الأصناف بالكامل — الذبائح والمناشئ والدرجات والقطع والأجزاء والمنتجات. */
  const clearTree = () => {
    const counts = TREE_LEVELS.map((l) => (model[l.key] || []).length).reduce((a, b) => a + b, 0);
    if (!window.confirm(t({
      en: `Delete all ${counts} record(s) in the product tree (animals, origins, grades, cuts, pieces, final products)? Saved reports keep their old values. Nothing is written until you press Save.`,
      ar: `حذف كل الـ${counts} سجل من شجرة الأصناف (ذبائح · مناشئ · درجات · قطع · أجزاء · منتجات نهائية)؟ التقارير المحفوظة بتحتفظ بقيمها. لا شي بينحفظ حتى تضغط «حفظ».`,
    }))) return;
    edit((n) => { TREE_LEVELS.forEach((l) => { n[l.key] = []; }); });
  };

  const resetDefaults = () => {
    if (!window.confirm(t({
      en: "Reset every setting to the built-in defaults? Nothing is saved until you press Save.",
      ar: "إرجاع كل الإعدادات للافتراضي؟ لا شيء يُحفظ حتى تضغط حفظ.",
    }))) return;
    setDraft(defaultConfig());
  };

  if (!canOpenButcherPage("butcher.settings")) return <NoAccess page="butcher.settings" />;

  /* أقسام الإعدادات — الأصناف كلها انتقلت للماستر ليست */
  const TABS = [
    {
      id: "rules", icon: "🛡️", ar: "الشروط", en: "Rules",
      arSub: "التحقق وسلوك شاشة الإدخال", enSub: "Validation & entry behaviour",
      count: (model.customRules || []).length || null,
    },
    {
      id: "butchers", icon: "🧑‍🍳", ar: "الجزارون", en: "Butchers",
      arSub: "سجل الأرقام الوظيفية", enSub: "Employee register",
      count: (model.butchers || []).length || null,
    },
    {
      id: "tree", icon: "🗂️", ar: "شجرة الأصناف", en: "Product tree",
      arSub: "تُدار من الماستر ليست", enSub: "Managed in the master list",
      count: TREE_LEVELS.reduce((s, l) => s + (model[l.key] || []).length, 0) || null,
    },
    {
      id: "templates", icon: "📐", ar: "وصفات التقطيع", en: "Cutting templates",
      arSub: "قوالب جاهزة برقم فريد", enSub: "Reusable recipes with a unique no.",
      count: (model.templates || []).length || null,
    },
    {
      id: "report", icon: "📄", ar: "ترويسة التقرير", en: "Report header",
      arSub: "الشركة والوثيقة والتواقيع", enSub: "Company, document & signatures",
    },
    {
      id: "admin", icon: "🧰", ar: "إدارة", en: "Admin",
      arSub: "نسخ احتياطي وسجل التغييرات", enSub: "Backup & change log",
    },
  ];

  return (
    <div dir={dir} className="bg bs" style={S.page}>
      <style>{CSS}</style>

      {/* ══ الترويسة — ثابتة فوق ══ */}
      <header className="bs-top" style={S.top}>
        <div style={S.topStart}>
          <span style={S.topIcon}>⚙️</span>
          <div style={{ minWidth: 0 }}>
            <div className="bg-title" style={S.title}>
              {t({ en: "Butcher Settings", ar: "إعدادات الجزار" })}
            </div>
            <div className="bg-sub" style={S.sub}>
              {model.updatedAt
                ? `${t({ en: "Last update", ar: "آخر تحديث" })}: ${new Date(model.updatedAt)
                    .toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" })}${
                    model.updatedBy ? ` — ${model.updatedBy}` : ""}`
                : t({ en: "Never saved yet", ar: "لم تُحفظ بعد" })}
            </div>
          </div>
          <span style={{
            ...S.statusChip,
            ...(readOnly ? S.chipRO : dirty ? S.chipDirty : S.chipOk),
          }}>
            {readOnly
              ? `👁️ ${t({ en: "View only", ar: "عرض فقط" })}`
              : loading
                ? t({ en: "Loading…", ar: "جارٍ التحميل…" })
                : dirty
                  ? `● ${t({ en: "Unsaved", ar: "غير محفوظ" })}`
                  : `✓ ${t({ en: "Saved", ar: "محفوظ" })}`}
          </span>
        </div>

        <div style={S.topActions}>
          <LangToggle lang={lang} toggle={toggle} style={S.langBtn} />
          <Link to="/butcher/master" style={S.masterBtn}>
            🗂️ {t({ en: "Master list", ar: "الماستر ليست" })}
          </Link>
          <button type="button" style={S.btn} onClick={() => navigate("/butcher")}>
            ← {t({ en: "Back", ar: "رجوع" })}
          </button>
        </div>
      </header>

      <div className="bs-shell" style={S.shell}>
        {/* ══ قائمة الأقسام ══ */}
        <nav className="bs-rail" style={S.rail}>
          {TABS.map((x) => {
            const on = tab === x.id;
            return (
              <button
                key={x.id}
                type="button"
                onClick={() => goTab(x.id)}
                style={{ ...S.navBtn, ...(on ? S.navBtnOn : null) }}
              >
                <span style={{ ...S.navIcon, ...(on ? S.navIconOn : null) }}>{x.icon}</span>
                <span style={S.navText}>
                  <span style={S.navName}>{isAr ? x.ar : x.en}</span>
                  <span className="bs-navhint" style={S.navHint}>{isAr ? x.arSub : x.enSub}</span>
                </span>
                {x.count ? <span style={S.navCount}>{x.count}</span> : null}
              </button>
            );
          })}

          {!readOnly && (
            <button type="button" style={S.railReset} onClick={resetDefaults}>
              ↺ {t({ en: "Reset to defaults", ar: "إرجاع الافتراضي" })}
            </button>
          )}
        </nav>

        {/* ══ المحتوى ══ */}
        <main style={S.main}>
          {msg && <div style={S.msgBar}>{msg}</div>}

          {/* ما يمنع الحفظ — رقم وصفة مكرّر أو كود خارج قائمة الأصناف */}
          {!readOnly && blockers.length > 0 && (
            <div style={S.blockers}>
              {blockers.map((b, i) => (
                <div key={i}>⚠️ {b}</div>
              ))}
            </div>
          )}

        {/* fieldset معطّل = كل الحقول والأزرار داخل الأقسام تصير للقراءة فقط */}
        <fieldset disabled={readOnly} style={S.panels}>

        {/* ═══ الشروط ═══ */}
        {tab === "rules" && (
          <div style={S.stack}>
            <div style={S.searchRow}>
              <span style={S.searchIcon}>🔎</span>
              <input
                style={S.search}
                value={ruleQ}
                placeholder={t({ en: "Search a setting…", ar: "ابحث عن شرط…" })}
                onChange={(e) => setRuleQ(e.target.value)}
              />
              {ruleQ && (
                <button type="button" style={S.searchClear} onClick={() => setRuleQ("")}>
                  ✕
                </button>
              )}
            </div>

            {shownGroups.length === 0 && (
              <div style={S.empty}>
                {t({ en: "No setting matches your search.", ar: "لا يوجد شرط مطابق للبحث." })}
              </div>
            )}

            {shownGroups.map((g) => (
              <section key={g.id} style={S.card}>
                <div style={S.cardHead}>
                  <span style={S.cardIcon}>{g.icon}</span>
                  <div style={{ minWidth: 0 }}>
                    <h2 className="bg-sec" style={S.cardTitle}>{isAr ? g.ar : g.en}</h2>
                    <div className="bg-sub" style={S.cardSub}>{isAr ? g.arSub : g.enSub}</div>
                  </div>
                </div>

                <div style={S.rows}>
                  {g.items.map((it) => {
                    const val = model.rules?.[it.key] ?? DEFAULT_RULES[it.key];
                    return (
                      <SettingRow
                        key={it.key}
                        label={isAr ? it.ar : it.en}
                        hint={isAr ? it.arHint : it.enHint}
                      >
                        {it.type === "switch" && (
                          <Switch
                            checked={!!val}
                            onChange={(v) => edit((n) => { n.rules[it.key] = v; })}
                          />
                        )}
                        {it.type === "number" && (
                          <span style={S.numWrap}>
                            <input
                              style={S.inputSm}
                              value={val ?? ""}
                              inputMode="decimal"
                              onChange={(e) =>
                                edit((n) => {
                                  n.rules[it.key] = numOr(e.target.value, DEFAULT_RULES[it.key]);
                                })
                              }
                            />
                            {it.unit && <span style={S.unit}>{t(it.unit)}</span>}
                          </span>
                        )}
                        {it.type === "select" && (
                          <select
                            style={{ ...S.inputSm, width: 170, textAlign: "start" }}
                            value={val ?? 0}
                            onChange={(e) =>
                              edit((n) => { n.rules[it.key] = Number(e.target.value); })
                            }
                          >
                            {it.options.map((o) => (
                              <option key={o.v} value={o.v}>
                                {o.label || t(o)}
                              </option>
                            ))}
                          </select>
                        )}
                      </SettingRow>
                    );
                  })}
                </div>
              </section>
            ))}

            {/* ── شروط يضيفها المستخدم ── */}
            <section style={S.card}>
              <div style={S.cardHead}>
                <span style={S.cardIcon}>✚</span>
                <div style={{ minWidth: 0 }}>
                  <h2 className="bg-sec" style={S.cardTitle}>
                    {t({ en: "Custom rules", ar: "شروط مخصّصة" })}
                  </h2>
                  <div className="bg-sub" style={S.cardSub}>
                    {t({
                      en: "Conditions the built-in list does not cover. They are stored with the settings and printed on the reports.",
                      ar: "شروط مش موجودة بالقائمة الجاهزة. بتنحفظ مع الإعدادات وبتظهر بالتقارير.",
                    })}
                  </div>
                </div>
                <button type="button" style={{ ...S.btn, ...S.btnPrimary, marginInlineStart: "auto" }}
                  onClick={addCustomRule}>
                  ＋ {t({ en: "Add rule", ar: "إضافة شرط" })}
                </button>
              </div>

              {(model.customRules || []).length === 0 ? (
                <div style={S.empty}>
                  {t({ en: "No custom rules yet.", ar: "لا توجد شروط مخصّصة بعد." })}
                </div>
              ) : (
                <div style={S.tableWrap}>
                  <table style={S.table}>
                    <thead>
                      <tr>
                        <th style={S.th}>{t({ en: "On", ar: "مفعّل" })}</th>
                        <th style={S.th}>{t({ en: "Arabic label", ar: "النص بالعربي" })}</th>
                        <th style={S.th}>{t({ en: "English label", ar: "النص بالإنجليزي" })}</th>
                        <th style={S.th}>{t({ en: "Type", ar: "النوع" })}</th>
                        <th style={S.th}>{t({ en: "Value", ar: "القيمة" })}</th>
                        <th style={S.th}>{t({ en: "ID", ar: "المعرّف" })}</th>
                        <th style={S.th}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {(model.customRules || []).map((r, i) => (
                        <tr key={r.id || i}>
                          <td style={S.td}>
                            <Switch
                              checked={r.enabled !== false}
                              onChange={(v) => editCustomRule(i, { enabled: v })}
                            />
                          </td>
                          <td style={S.td}>
                            <input style={S.input} value={r.ar || ""}
                              onChange={(e) => editCustomRule(i, { ar: e.target.value })} />
                          </td>
                          <td style={S.td}>
                            <input style={S.input} value={r.en || ""}
                              onChange={(e) => editCustomRule(i, { en: e.target.value })} />
                          </td>
                          <td style={S.td}>
                            <select
                              style={S.inputSm}
                              value={r.type || "toggle"}
                              onChange={(e) => {
                                const type = e.target.value;
                                editCustomRule(i, {
                                  type,
                                  value: type === "toggle" ? false : type === "number" ? 0 : "",
                                });
                              }}
                            >
                              <option value="toggle">{t({ en: "Yes / No", ar: "نعم / لا" })}</option>
                              <option value="number">{t({ en: "Number", ar: "رقم" })}</option>
                              <option value="text">{t({ en: "Text", ar: "نص" })}</option>
                            </select>
                          </td>
                          <td style={S.td}>
                            {r.type === "toggle" || !r.type ? (
                              <Switch
                                checked={!!r.value}
                                onChange={(v) => editCustomRule(i, { value: v })}
                              />
                            ) : (
                              <input
                                style={S.input}
                                value={r.value ?? ""}
                                inputMode={r.type === "number" ? "decimal" : "text"}
                                onChange={(e) =>
                                  editCustomRule(i, {
                                    value: r.type === "number" ? numOr(e.target.value, 0) : e.target.value,
                                  })
                                }
                              />
                            )}
                          </td>
                          <td style={{ ...S.td, color: "#8aa3b8" }}>{r.id}</td>
                          <td style={S.td}>
                            <DeleteButton t={t} label={r.ar || r.en || r.id}
                              onDelete={() => removeCustomRule(i)} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        )}

        {/* ═══ الجزارون ═══ */}
        {tab === "butchers" && (
          <div style={S.card}>
            <div style={S.cardHead}>
              <span style={S.cardIcon}>🧑‍🍳</span>
              <div style={{ minWidth: 0 }}>
                <h2 className="bg-sec" style={S.cardTitle}>
                  {t({ en: "Butchers register", ar: "سجل الجزارين" })}
                </h2>
                <div className="bg-sub" style={S.cardSub}>
                  {t({
                    en: "Who is allowed to record cut weights, and from which butchery.",
                    ar: "مين مسموح له يسجّل أوزان التقطيع، ومن أي ملحمة.",
                  })}
                </div>
              </div>
              <button type="button" style={{ ...S.btn, ...S.btnPrimary, marginInlineStart: "auto" }}
                onClick={addButcher}>
                ＋ {t({ en: "Add butcher", ar: "إضافة جزّار" })}
              </button>
            </div>
            <div style={S.tableWrap}>
              <table style={S.table}>
                <thead>
                  <tr>
                    <th style={S.th}>{t({ en: "Active", ar: "نشط" })}</th>
                    <th style={S.th}>{t({ en: "Employee (from register)", ar: "الموظف (من السجل)" })}</th>
                    <th style={S.th}>{t({ en: "Name", ar: "الاسم" })}</th>
                    <th style={S.th}>{t({ en: "Default butchery", ar: "الملحمة الافتراضية" })}</th>
                    <th style={S.th}>{t({ en: "History", ar: "الهيستوري" })}</th>
                    <th style={S.th}></th>
                  </tr>
                </thead>
                <tbody>
                  {(model.butchers || []).length === 0 && (
                    <tr>
                      <td style={S.td} colSpan={6}>
                        {t({ en: "No butchers registered yet.", ar: "لا يوجد جزارون مسجّلون بعد." })}
                      </td>
                    </tr>
                  )}
                  {(model.butchers || []).map((b, i) => (
                    <tr key={`b${i}`}>
                      <td style={S.td}>
                        <input type="checkbox" checked={b.active !== false}
                          onChange={(e) => editButcher(i, { active: e.target.checked })} />
                      </td>
                      <td style={S.td}>
                        <EmployeePicker
                          value={b.empNo || ""}
                          onPick={(no) => fillButcherFromDirectory(i, no)}
                          t={t}
                        />
                      </td>
                      <td style={S.td}>
                        <input style={S.input} value={b.name || ""}
                          onChange={(e) => editButcher(i, { name: e.target.value })} />
                        {b.job && <div style={S.tag}>{b.job}</div>}
                      </td>
                      <td style={S.td}>
                        <select style={S.input} value={b.branch || ""}
                          onChange={(e) => editButcher(i, { branch: e.target.value })}>
                          <option value="">{t({ en: "None", ar: "بلا" })}</option>
                          {BRANCHES.map((x) => (
                            <option key={x.code} value={x.code}>{nameOf(x, isAr)}</option>
                          ))}
                        </select>
                      </td>
                      <td style={S.td}>
                        <HistoryCell entries={b.history} t={t} isAr={isAr} />
                      </td>
                      <td style={S.td}>
                        <button type="button" style={S.del} onClick={() => removeButcher(i)}>
                          {t({ en: "Delete", ar: "حذف" })}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={S.note}>
              {t({
                en: "Pick the employee number from the shared employee register — the name, job and butchery fill in automatically. Every edit is kept in the row history. Turn on “Accept registered employee numbers only” in Rules to reject unknown numbers at entry.",
                ar: "اختر الرقم الوظيفي من سجل الموظفين المشترك — الاسم والوظيفة والملحمة بينعبّوا لحالهم. كل تعديل بينحفظ في هيستوري السطر. فعّل «قبول الأرقام المسجّلة فقط» من الشروط لرفض أي رقم غير مسجّل عند الإدخال.",
              })}
            </div>
            <button type="button" style={S.btn} onClick={addButcher}>
              + {t({ en: "Add butcher", ar: "إضافة جزّار" })}
            </button>
          </div>
        )}

        {/* ═══ شجرة الأصناف — كلها تُدار من الماستر ليست ═══ */}
        {tab === "tree" && (
          <div style={S.card}>
            <div style={S.cardHead}>
              <span style={S.cardIcon}>🗂️</span>
              <div style={{ minWidth: 0 }}>
                <h2 className="bg-sec" style={S.cardTitle}>
                  {t({ en: "Product tree", ar: "شجرة الأصناف" })}
                </h2>
                <div className="bg-sub" style={S.cardSub}>
                  {t({
                    en: "Animal → origin → grade → cut → final product.",
                    ar: "ذبيحة ← منشأ ← درجة ← قطعة ← منتج نهائي.",
                  })}
                </div>
              </div>
              <Link to="/butcher/master" style={{ ...S.masterBtn, marginInlineStart: "auto" }}>
                🗂️ {t({ en: "Open the master list", ar: "فتح الماستر ليست" })}
              </Link>
            </div>
            <div style={S.note}>
              {t({
                en: "Animals, origins, grades, cuts, pieces and final products all live in one master list now — every record opens as one form with all of its attributes.",
                ar: "الذبائح والمناشئ والدرجات والقطع والأجزاء والمنتجات النهائية صاروا كلهم بماستر ليست وحدة — كل سجل بيفتح بنموذج واحد فيه كل خصائصه.",
              })}
            </div>

            <div style={S.treeGrid}>
              {TREE_LEVELS.map((l) => (
                <Link
                  key={l.key}
                  // فتح أول سجل بالمستوى مباشرة — وإلا القائمة بلا اختيار
                  to={(model[l.key] || [])[0]
                    ? `/butcher/product/${l.key}/${model[l.key][0].id}`
                    : "/butcher/master"}
                  style={S.treeCard}
                >
                  <span style={S.treeIcon}>{l.icon}</span>
                  <span style={S.treeName}>{isAr ? l.ar : l.en}</span>
                  <span style={S.treeCount}>
                    {(model[l.key] || []).length} {t({ en: "records", ar: "سجل" })}
                  </span>
                </Link>
              ))}
            </div>

            <Link to="/butcher/master" style={S.masterBtn}>
              🗂️ {t({ en: "Open the master list", ar: "فتح الماستر ليست" })}
            </Link>

            {/* منطقة خطرة — تفريغ الشجرة كاملة */}
            {!readOnly && (
              <div style={S.danger}>
                <div style={S.dangerTitle}>
                  ⚠️ {t({ en: "Danger zone", ar: "منطقة خطرة" })}
                </div>
                <div style={S.dangerText}>
                  {t({
                    en: "Empties every level of the tree at once so you can build it from scratch. Saved reports keep their old values, and nothing is written until you press Save.",
                    ar: "بيفرّغ كل مستويات الشجرة دفعة وحدة حتى تبنيها من الصفر. التقارير المحفوظة بتحتفظ بقيمها، ولا شي بينحفظ حتى تضغط «حفظ».",
                  })}
                </div>
                <button type="button" style={S.dangerBtn} onClick={clearTree}>
                  🗑 {t({ en: "Clear the whole product tree", ar: "تفريغ شجرة الأصناف بالكامل" })}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ═══ وصفات التقطيع ═══ */}
        {tab === "templates" && (
          <TemplatesTab
            t={t}
            isAr={isAr}
            model={model}
            templates={model.templates || []}
            animals={animalsOn}
            editTemplate={editTemplate}
            addTemplate={addTemplate}
            removeTemplate={removeTemplate}
            editTemplateLine={editTemplateLine}
            addTemplateLine={addTemplateLine}
            removeTemplateLine={removeTemplateLine}
          />
        )}

        {/* ═══ ترويسة التقرير ═══ */}
        {tab === "report" && (
          <div style={S.card}>
            <div style={S.cardHead}>
              <span style={S.cardIcon}>📄</span>
              <div style={{ minWidth: 0 }}>
                <h2 className="bg-sec" style={S.cardTitle}>
                  {t({ en: "Official report header", ar: "ترويسة التقرير الرسمية" })}
                </h2>
                <div className="bg-sub" style={S.cardSub}>
                  {t({
                    en: "Printed at the top of the Full Summary Report.",
                    ar: "بتنطبع فوق التقرير الشامل.",
                  })}
                </div>
              </div>
            </div>

            <div style={S.grid2}>
              <Field label={t({ en: "Company (English)", ar: "الشركة (إنجليزي)" })}
                value={model.report.companyEn}
                onChange={(v) => editReport({ companyEn: v })} />
              <Field label={t({ en: "Company (Arabic)", ar: "الشركة (عربي)" })}
                value={model.report.companyAr}
                onChange={(v) => editReport({ companyAr: v })} />
              <Field label={t({ en: "Document no.", ar: "رقم الوثيقة" })}
                value={model.report.docNo}
                onChange={(v) => editReport({ docNo: v })} />
              <Field label={t({ en: "Revision no.", ar: "رقم المراجعة" })}
                value={model.report.revNo}
                onChange={(v) => editReport({ revNo: v })} />
              <Field label={t({ en: "Issue date", ar: "تاريخ الإصدار" })}
                value={model.report.issueDate} type="date"
                onChange={(v) => editReport({ issueDate: v })} />
            </div>

            <div style={S.rowField}>
              <span style={S.rowLabel}>{t({ en: "Logo", ar: "الشعار" })}</span>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                {model.report.logoUrl && (
                  <img src={model.report.logoUrl} alt="logo" style={S.logoPreview} />
                )}
                <ImageUpload
                  t={t}
                  purpose="butcher_report_logo"
                  label={t({ en: "Upload logo", ar: "رفع شعار" })}
                  onDone={(url) => editReport({ logoUrl: url })}
                />
                {model.report.logoUrl && (
                  <button type="button" style={S.del} onClick={() => editReport({ logoUrl: "" })}>
                    {t({ en: "Remove", ar: "إزالة" })}
                  </button>
                )}
              </div>
            </div>

            <div className="bg-sec" style={S.secTitle}>
              {t({ en: "Signature boxes", ar: "خانات التواقيع" })}
            </div>
            {(model.report.signatures || []).length === 0 && (
              <div style={S.empty}>
                {t({ en: "No signature boxes yet.", ar: "لا توجد خانات تواقيع بعد." })}
              </div>
            )}
            {(model.report.signatures || []).map((sg, i) => (
              <div key={`sg${i}`} style={S.sigRow}>
                <div style={S.grid2}>
                  <Field label={`${t({ en: "Box", ar: "خانة" })} ${i + 1} — EN`}
                    value={sg.en} onChange={(v) => editSignature(i, "en", v)} />
                  <Field label={`${t({ en: "Box", ar: "خانة" })} ${i + 1} — AR`}
                    value={sg.ar} onChange={(v) => editSignature(i, "ar", v)} />
                </div>
                <button type="button" style={S.del} onClick={() => removeSignature(i)}>
                  {t({ en: "Delete", ar: "حذف" })}
                </button>
              </div>
            ))}
            <button type="button" style={S.btn} onClick={addSignature}>
              ＋ {t({ en: "Add signature box", ar: "إضافة خانة توقيع" })}
            </button>

            <div style={S.note}>
              {t({
                en: "These appear on the Full Summary Report when printed.",
                ar: "هذه تظهر على التقرير الشامل عند الطباعة.",
              })}
            </div>
          </div>
        )}

        {/* ═══ إدارة ═══ */}
        {tab === "admin" && (
          <AdminTab
            t={t} isAr={isAr} model={model} readOnly={readOnly}
            onImport={(parsed) => setDraft(parsed)}
          />
        )}

        </fieldset>
        </main>
      </div>

      {/* ══ شريط الحفظ العائم — يطلع بس لما يصير في تعديل ══ */}
      {!readOnly && (dirty || saving) && (
        <div style={S.saveDock}>
          <div style={{ ...S.saveBar, ...(blockers.length ? S.saveBarBad : null) }}>
            <span style={S.saveMsg}>
              {blockers.length
                ? `⚠️ ${blockers[0]}`
                : `● ${t({ en: "You have unsaved changes", ar: "عندك تعديلات غير محفوظة" })}`}
            </span>
            <span style={S.saveBtns}>
              <button
                type="button"
                style={S.btnGhost}
                onClick={() => { setDraft(null); setMsg(""); }}
              >
                {t({ en: "Discard", ar: "تراجع" })}
              </button>
              <button
                type="button"
                style={{
                  ...S.btn, ...S.btnPrimary,
                  ...(saving || blockers.length ? S.btnOff : null),
                }}
                onClick={save}
                disabled={saving || blockers.length > 0}
              >
                {saving
                  ? t({ en: "Saving…", ar: "جارٍ الحفظ…" })
                  : `💾 ${t({ en: "Save changes", ar: "حفظ التغييرات" })}`}
              </button>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════ مكوّنات ═══════════════ */

/* ── قائمة أكواد المرتجعات: تُحمَّل مرة واحدة وتُشارَك بين كل الحقول ── */
let catalogCache = null;
function useItemCatalog() {
  const [items, setItems] = useState(catalogCache || []);
  useEffect(() => {
    if (catalogCache) return;
    const pub = process.env.PUBLIC_URL || "";
    fetch(`${pub}/data/items.json`, { cache: "force-cache" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("no catalog"))))
      .then((d) => {
        catalogCache = Array.isArray(d) ? d : [];
        setItems(catalogCache);
      })
      .catch(() => { catalogCache = []; });
  }, []);
  return items;
}

function Field({ label, value, onChange, type = "text" }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <span style={S.rowLabel}>{label}</span>
      <input
        type={type}
        style={S.input}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

/** إدارة: تصدير/استيراد الإعدادات + سجل التغييرات من قاعدة التدقيق. */
function AdminTab({ t, isAr, model, onImport, readOnly }) {
  const fileRef = useRef(null);
  const [audit, setAudit] = useState(null);
  const [auditErr, setAuditErr] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    let alive = true;
    fetch(`${API_BASE}/api/audit?type=butcher_config&limit=30`, {
      headers: { Accept: "application/json" }, cache: "no-store",
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`Server ${r.status}`))))
      .then((d) => { if (alive) setAudit(Array.isArray(d?.rows) ? d.rows : []); })
      .catch((e) => { if (alive) setAuditErr(e?.message || "error"); });
    return () => { alive = false; };
  }, []);

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(model, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `butcher-settings-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importJson = async (file) => {
    if (!file) return;
    setMsg("");
    try {
      const parsed = JSON.parse(await file.text());
      if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.cuts)) {
        throw new Error(t({ en: "Not a butcher settings file", ar: "الملف ليس إعدادات جزار" }));
      }
      onImport(mergeConfig(parsed));
      setMsg(t({
        en: "Loaded into the editor — press Save to apply.",
        ar: "تم التحميل في المحرّر — اضغط حفظ للتطبيق.",
      }));
    } catch (e) {
      setMsg(`${t({ en: "Import failed", ar: "فشل الاستيراد" })}: ${e?.message || e}`);
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div style={S.card}>
      <div className="bg-sec" style={S.secTitle}>
        {t({ en: "Backup & restore", ar: "نسخة احتياطية واستعادة" })}
      </div>
      {readOnly ? (
        <div style={S.note}>
          {t({
            en: "Backup and restore need edit rights on the Butcher section.",
            ar: "النسخ الاحتياطي والاستعادة يحتاجان صلاحية تعديل على قسم الجزار.",
          })}
        </div>
      ) : (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" style={S.btn} onClick={exportJson}>
            ⬇️ {t({ en: "Export settings (JSON)", ar: "تصدير الإعدادات (JSON)" })}
          </button>
          <input ref={fileRef} type="file" accept="application/json" style={{ display: "none" }}
            onChange={(e) => importJson(e.target.files?.[0])} />
          <button type="button" style={S.btn} onClick={() => fileRef.current?.click()}>
            ⬆️ {t({ en: "Import settings", ar: "استيراد إعدادات" })}
          </button>
        </div>
      )}
      {msg && <div style={S.note}>{msg}</div>}

      <div className="bg-sec" style={S.secTitle}>
        {t({ en: "Change log", ar: "سجل التغييرات" })}
      </div>
      {auditErr && (
        <div style={S.note}>
          {t({
            en: "Change log is available to administrators on a deployed server.",
            ar: "سجل التغييرات متاح للمدراء على السيرفر المنشور.",
          })} ({auditErr})
        </div>
      )}
      {audit && audit.length === 0 && (
        <div style={S.note}>{t({ en: "No changes recorded yet.", ar: "لا تغييرات مسجّلة بعد." })}</div>
      )}
      {audit && audit.length > 0 && (
        <div style={S.tableWrap}>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>{t({ en: "When", ar: "الوقت" })}</th>
                <th style={S.th}>{t({ en: "User", ar: "المستخدم" })}</th>
                <th style={S.th}>{t({ en: "Action", ar: "الإجراء" })}</th>
                <th style={S.th}>{t({ en: "Route", ar: "المسار" })}</th>
              </tr>
            </thead>
            <tbody>
              {audit.map((r) => (
                <tr key={r.id}>
                  <td style={S.td}>
                    {new Date(r.created_at).toLocaleString(isAr ? "ar-EG" : "en-GB", {
                      dateStyle: "short", timeStyle: "short",
                    })}
                  </td>
                  <td style={S.td}>{r.username || "—"}</td>
                  <td style={S.td}>{r.action}</td>
                  <td style={{ ...S.td, color: "#8aa3b8" }}>{r.route || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/** سطر إعداد: عنوان + شرح صغير على الجنب، والتحكّم على الطرف الثاني. */
function SettingRow({ label, hint, children }) {
  return (
    <div className="bs-row" style={S.settingRow}>
      <span style={S.settingText}>
        <span style={S.settingLabel}>{label}</span>
        {hint && <span className="bg-small" style={S.settingHint}>{hint}</span>}
      </span>
      <span style={S.settingCtl}>{children}</span>
    </div>
  );
}

/** مفتاح تشغيل/إيقاف — زر حتى يتعطّل تلقائياً داخل fieldset «عرض فقط». */
function Switch({ checked, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      className={`bs-sw${checked ? " on" : ""}`}
      onClick={() => onChange(!checked)}
    >
      <span className="bs-knob" />
    </button>
  );
}

/** زر حذف موحّد — يسأل قبل الحذف لأن كل العناصر صارت قابلة للحذف. */
function DeleteButton({ onDelete, label, t }) {
  return (
    <button
      type="button"
      style={S.del}
      onClick={() => {
        const ok = window.confirm(
          t({
            en: `Delete “${label}”? Saved records keep their old values; this only changes the lists.`,
            ar: `حذف «${label}»؟ السجلات المحفوظة بتحتفظ بقيمها القديمة، هذا بيغيّر القوائم فقط.`,
          })
        );
        if (ok) onDelete();
      }}
    >
      {t({ en: "Delete", ar: "حذف" })}
    </button>
  );
}

/** رفع صورة إلى خدمة الصور — لا base64 داخل الإعدادات أبداً. */
function ImageUpload({ onDone, t, purpose = "butcher_image", label }) {
  const ref = useRef(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const pick = async (file) => {
    if (!file) return;
    setBusy(true);
    setErr("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("purpose", purpose);
      fd.append("compress", "true");
      fd.append("maxDim", "600");
      fd.append("quality", "85");
      const res = await fetch(`${IMAGE_API_BASE}/api/images`, { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !(data.optimized_url || data.url)) {
        throw new Error(data?.error || `Server ${res.status}`);
      }
      onDone(data.optimized_url || data.url);
    } catch (e) {
      setErr(e?.message || "upload failed");
    } finally {
      setBusy(false);
      if (ref.current) ref.current.value = "";
    }
  };

  return (
    <>
      <input ref={ref} type="file" accept="image/*" style={{ display: "none" }}
        onChange={(e) => pick(e.target.files?.[0])} />
      <button type="button" style={S.artUpload} disabled={busy} onClick={() => ref.current?.click()}>
        {busy
          ? t({ en: "Uploading…", ar: "جارٍ الرفع…" })
          : label || t({ en: "Upload picture", ar: "رفع صورة" })}
      </button>
      {err && <span style={{ color: "#a12626", fontWeight: 800 }}>{err}</span>}
    </>
  );
}

/** اختيار موظف من سجل الموظفين المشترك — بحث بالرقم أو الاسم. */
function EmployeePicker({ value, onPick, t }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);

  const rec = EMPLOYEES[String(value || "").trim()] || null;

  const results = useMemo(() => {
    const s = q.trim().toUpperCase();
    if (!s) return [];
    return Object.entries(EMPLOYEES)
      .filter(
        ([no, r]) =>
          no.toUpperCase().includes(s) || String(r.name || "").toUpperCase().includes(s)
      )
      .slice(0, 12);
  }, [q]);

  return (
    <div style={S.codeWrap}>
      <input
        style={{ ...S.inputSm, width: 108, ...(value && !rec ? S.codeBad : null) }}
        value={value}
        placeholder={t({ en: "no. / name", ar: "رقم / اسم" })}
        inputMode="text"
        onChange={(e) => { onPick(e.target.value); setQ(e.target.value); setOpen(true); }}
        onFocus={() => { setQ(value || ""); setOpen(true); }}
        onBlur={() => window.setTimeout(() => setOpen(false), 180)}
        title={rec?.name || ""}
      />
      {open && results.length > 0 && (
        <div style={S.codeList}>
          {results.map(([no, r]) => (
            <button
              key={no}
              type="button"
              style={S.codeOpt}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => { onPick(no); setOpen(false); }}
            >
              <b>{no}</b> — {r.name}
              <div style={{ color: "#8aa3b8", fontWeight: 700 }}>{r.branch}</div>
            </button>
          ))}
        </div>
      )}
      {value && !rec && (
        <div style={{ color: "#a12626", fontWeight: 800 }}>
          ⚠️ {t({ en: "not in the register", ar: "غير موجود بالسجل" })}
        </div>
      )}
    </div>
  );
}

/** هيستوري السطر — عدد التغييرات مع تفصيل عند الفتح. */
function HistoryCell({ entries, t, isAr }) {
  const [open, setOpen] = useState(false);
  const list = Array.isArray(entries) ? entries : [];

  if (!list.length) {
    return <span style={{ color: "#8aa3b8", fontWeight: 700 }}>—</span>;
  }

  return (
    <div style={{ textAlign: "start" }}>
      <button type="button" style={S.linkBtn} onClick={() => setOpen((v) => !v)}>
        {list.length} {t({ en: "changes", ar: "تغيير" })} {open ? "▲" : "▼"}
      </button>
      {open && (
        <div style={S.historyBox}>
          {[...list].reverse().map((h, i) => (
            <div key={i} style={S.historyRow}>
              <span style={{ color: "#8aa3b8" }}>
                {new Date(h.at).toLocaleString(isAr ? "ar-EG" : "en-GB", {
                  dateStyle: "short", timeStyle: "short",
                })}
                {h.by ? ` — ${h.by}` : ""}
              </span>
              {(h.changes || []).map((c, k) => (
                <div key={k}>
                  <b>{c.field}</b>: {String(c.from) || "—"} → {String(c.to) || "—"}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════ وصفات التقطيع — لكل وصفة رقم فريد ═══════════ */

function TemplatesTab({
  t, isAr, model, templates, animals,
  editTemplate, addTemplate, removeTemplate,
  editTemplateLine, addTemplateLine, removeTemplateLine,
}) {
  const dupes = duplicateTemplateNos(templates);
  // كل ما يمكن أن يكون سطراً في الوصفة: قطع + أجزاء + منتجات نهائية
  const items = useMemo(
    () => [
      ...enabledOnly(model.cuts),
      ...enabledOnly(model.pieces).filter((p) => !p.whole),
      ...enabledOnly(model.products),
    ],
    [model]
  );

  return (
    <div style={S.card}>
      <div className="bg-sec" style={S.secTitle}>
        {t({ en: "Cutting templates", ar: "وصفات / قوالب التقطيع" })}
      </div>
      <div style={S.note}>
        {t({
          en: "Save a cutting method once and reuse it. Each template has its own number — a duplicate number is flagged and blocks saving while “Cutting template numbers must be unique” is on.",
          ar: "احفظ طريقة التقطيع مرة واستعملها دائماً. كل وصفة إلها رقمها — الرقم المكرّر بينبّه ويمنع الحفظ طالما شرط «منع تكرار رقم الوصفة» مفعّل.",
        })}
      </div>

      {templates.length === 0 && (
        <div style={S.note}>{t({ en: "No templates yet.", ar: "لا توجد وصفات بعد." })}</div>
      )}

      {templates.map((tpl) => {
        const no = String(tpl.no || "").trim().toUpperCase();
        const dup = !!no && dupes.has(no);
        const totalPct = (tpl.lines || []).reduce((s, l) => s + (Number(l.pct) || 0), 0);
        return (
          <div key={tpl.id} style={{ ...S.branchBox, ...(dup ? S.branchBoxBad : null) }}>
            <div style={S.branchHead}>
              <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={S.rowLabel}>{t({ en: "Template no.", ar: "رقم الوصفة" })}</span>
                <input
                  style={{ ...S.inputSm, width: 130, ...(dup ? S.codeBad : null) }}
                  value={tpl.no || ""}
                  onChange={(e) => editTemplate(tpl.id, { no: e.target.value })}
                />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
                <span style={S.rowLabel}>{t({ en: "Name (AR)", ar: "الاسم بالعربي" })}</span>
                <input style={S.input} value={tpl.ar || ""}
                  onChange={(e) => editTemplate(tpl.id, { ar: e.target.value })} />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
                <span style={S.rowLabel}>{t({ en: "Name (EN)", ar: "الاسم بالإنجليزي" })}</span>
                <input style={S.input} value={tpl.en || ""}
                  onChange={(e) => editTemplate(tpl.id, { en: e.target.value })} />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={S.rowLabel}>{t({ en: "Animal", ar: "النوع" })}</span>
                <select style={S.input} value={tpl.animalId || ""}
                  onChange={(e) => editTemplate(tpl.id, { animalId: e.target.value, originId: "" })}>
                  <option value="">{t({ en: "Any", ar: "الكل" })}</option>
                  {animals.map((a) => (
                    <option key={a.id} value={a.id}>{nameOf(a, isAr)}</option>
                  ))}
                </select>
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={S.rowLabel}>{t({ en: "Origin", ar: "المنشأ" })}</span>
                <select style={S.input} value={tpl.originId || ""}
                  onChange={(e) => editTemplate(tpl.id, { originId: e.target.value })}>
                  <option value="">{t({ en: "Any", ar: "الكل" })}</option>
                  {originsForAnimal(model, tpl.animalId).map((o) => (
                    <option key={o.id} value={o.id}>{nameOf(o, isAr)}</option>
                  ))}
                </select>
              </label>
              <DeleteButton t={t} label={tpl.no || tpl.ar || tpl.id}
                onDelete={() => removeTemplate(tpl.id)} />
            </div>

            {dup && (
              <div style={S.dupWarn}>
                ⚠️ {t({
                  en: `Template number “${tpl.no}” is already used by another template — give this one a different number.`,
                  ar: `رقم الوصفة «${tpl.no}» مستعمل بوصفة ثانية — غيّر الرقم.`,
                })}
              </div>
            )}

            <div style={S.tableWrap}>
              <table style={S.table}>
                <thead>
                  <tr>
                    <th style={S.th}>{t({ en: "Item", ar: "العنصر" })}</th>
                    <th style={S.th}>{t({ en: "% of carcass", ar: "٪ من الذبيحة" })}</th>
                    <th style={S.th}>{t({ en: "Note", ar: "ملاحظة" })}</th>
                    <th style={S.th}></th>
                  </tr>
                </thead>
                <tbody>
                  {(tpl.lines || []).length === 0 && (
                    <tr><td style={S.td} colSpan={4}>
                      {t({ en: "No lines yet.", ar: "لا توجد أسطر بعد." })}
                    </td></tr>
                  )}
                  {(tpl.lines || []).map((l, i) => (
                    <tr key={i}>
                      <td style={S.td}>
                        <select
                          style={S.input}
                          value={l.itemId || ""}
                          onChange={(e) => editTemplateLine(tpl.id, i, { itemId: e.target.value })}
                        >
                          <option value="">{t({ en: "Select…", ar: "اختر…" })}</option>
                          {items.map((it) => (
                            <option key={it.id} value={it.id}>{nameOf(it, isAr)}</option>
                          ))}
                        </select>
                      </td>
                      <td style={S.td}>
                        <input style={S.inputSm} value={l.pct ?? ""} inputMode="decimal"
                          onChange={(e) => editTemplateLine(tpl.id, i, { pct: e.target.value })} />
                      </td>
                      <td style={S.td}>
                        <input style={S.input} value={l.note || ""}
                          onChange={(e) => editTemplateLine(tpl.id, i, { note: e.target.value })} />
                      </td>
                      <td style={S.td}>
                        <button type="button" style={S.del}
                          onClick={() => removeTemplateLine(tpl.id, i)}>
                          {t({ en: "Delete", ar: "حذف" })}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                {(tpl.lines || []).length > 0 && (
                  <tfoot>
                    <tr>
                      <td style={{ ...S.td, fontWeight: 900 }}>
                        {t({ en: "Total", ar: "المجموع" })}
                      </td>
                      <td style={{
                        ...S.td, fontWeight: 900,
                        color: totalPct > 100 ? "#a12626" : "#14507f",
                      }}>
                        {totalPct.toFixed(1)}%
                      </td>
                      <td style={S.td} colSpan={2}>
                        {totalPct > 100 && (
                          <span style={{ color: "#a12626", fontWeight: 800 }}>
                            {t({ en: "Over 100% of the carcass", ar: "أكثر من ١٠٠٪ من الذبيحة" })}
                          </span>
                        )}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            <button type="button" style={S.btn} onClick={() => addTemplateLine(tpl.id)}>
              + {t({ en: "Add line", ar: "إضافة سطر" })}
            </button>
          </div>
        );
      })}

      <button type="button" style={S.btn} onClick={addTemplate}>
        + {t({ en: "Add template", ar: "إضافة وصفة" })}
      </button>
    </div>
  );
}

const FONT = "Cairo, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif";

const S = {
  page: {
    minHeight: "100vh", background: "#eef4fb", fontFamily: FONT, color: "#0f2740",
    padding: "0 clamp(12px, 2.2vw, 26px) 120px", overflowX: "hidden",
  },

  /* ── الترويسة الثابتة ── */
  top: {
    position: "sticky", top: 0, zIndex: 40,
    display: "flex", alignItems: "center", justifyContent: "space-between",
    flexWrap: "wrap", gap: 14,
    background: "rgba(255,255,255,.92)", borderBottom: "1px solid #dbe6f2",
    padding: "14px clamp(4px, 1vw, 14px)", marginBottom: 20,
  },
  topStart: { display: "flex", alignItems: "center", gap: 14, minWidth: 0, flexWrap: "wrap" },
  topIcon: {
    width: 52, height: 52, borderRadius: 16, flexShrink: 0,
    display: "grid", placeItems: "center", fontSize: 26,
    background: "linear-gradient(135deg,#1f6fd0,#14507f)", color: "#fff",
    boxShadow: "0 8px 20px rgba(31,111,208,.28)",
  },
  title: { fontWeight: 900, letterSpacing: "-0.01em", lineHeight: 1.2 },
  sub: { color: "#6b8299", fontWeight: 700, marginTop: 3 },
  statusChip: {
    borderRadius: 999, padding: "6px 16px", fontWeight: 900, whiteSpace: "nowrap",
  },
  chipOk: { background: "#ecfdf5", color: "#047857", border: "1px solid #a7f3d0" },
  chipDirty: { background: "#fffbeb", color: "#b45309", border: "1px solid #fde68a" },
  chipRO: { background: "#f3f8fd", color: "#3c5a75", border: "1px solid #cfe0f0" },
  topActions: { display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" },
  langBtn: { background: "#fff", border: "1px solid #cfe0f0", color: "#1f6fd0" },

  btn: {
    border: "1.5px solid #cfe0f0", background: "#fff", color: "#3c5a75",
    borderRadius: 12, padding: "11px 20px", fontWeight: 800, fontFamily: FONT,
    cursor: "pointer", whiteSpace: "nowrap",
  },
  btnPrimary: { background: "#1f6fd0", color: "#fff", border: "1.5px solid #1f6fd0" },
  btnGhost: {
    border: "1.5px solid rgba(255,255,255,.35)", background: "transparent", color: "#fff",
    borderRadius: 12, padding: "11px 20px", fontWeight: 800, fontFamily: FONT,
    cursor: "pointer", whiteSpace: "nowrap",
  },
  btnOff: { background: "#a9c3dd", border: "1.5px solid #a9c3dd", cursor: "not-allowed" },

  /* ── شريط الأقسام ── */
  shell: {},
  rail: {
    display: "flex", flexDirection: "column", gap: 6,
    background: "#fff", border: "1px solid #dbe6f2", borderRadius: 18,
    padding: 10, boxShadow: "0 10px 26px rgba(15,39,64,.05)",
  },
  navBtn: {
    display: "flex", alignItems: "center", gap: 12, width: "100%",
    border: "1px solid transparent", background: "transparent", borderRadius: 14,
    padding: "11px 12px", cursor: "pointer", fontFamily: FONT, color: "#0f2740",
    textAlign: "start", minWidth: 0,
  },
  navBtnOn: { background: "#e7f1fd", border: "1px solid #bcd9f7" },
  navIcon: {
    width: 40, height: 40, borderRadius: 12, flexShrink: 0,
    display: "grid", placeItems: "center", background: "#f2f7fc", fontSize: 20,
  },
  navIconOn: { background: "#1f6fd0", color: "#fff" },
  navText: { display: "flex", flexDirection: "column", minWidth: 0 },
  navName: { fontWeight: 900, whiteSpace: "nowrap" },
  navHint: {
    color: "#8aa3b8", fontWeight: 700, whiteSpace: "nowrap",
    overflow: "hidden", textOverflow: "ellipsis",
  },
  navCount: {
    marginInlineStart: "auto", background: "#eef4fb", color: "#14507f",
    borderRadius: 999, padding: "1px 11px", fontWeight: 900, flexShrink: 0,
  },
  railReset: {
    marginTop: 6, border: "1.5px solid #f0d6d6", background: "#fff", color: "#a12626",
    borderRadius: 12, padding: "10px 12px", fontWeight: 800, fontFamily: FONT,
    cursor: "pointer", whiteSpace: "nowrap",
  },

  main: { minWidth: 0, display: "flex", flexDirection: "column", gap: 16 },
  stack: { display: "flex", flexDirection: "column", gap: 16 },
  msgBar: {
    background: "#f2f8ff", border: "1px solid #cfe0f0", color: "#14507f",
    borderRadius: 12, padding: "12px 16px", fontWeight: 800,
  },

  /* ── البحث داخل الشروط ── */
  searchRow: {
    display: "flex", alignItems: "center", gap: 10,
    background: "#fff", border: "1px solid #dbe6f2", borderRadius: 14,
    padding: "6px 14px", boxShadow: "0 6px 16px rgba(15,39,64,.04)",
  },
  searchIcon: { color: "#8aa3b8", flexShrink: 0 },
  search: {
    flex: 1, border: "none", outline: "none", background: "transparent",
    padding: "10px 0", fontWeight: 700, fontFamily: FONT, color: "#0f2740", minWidth: 0,
  },
  searchClear: {
    border: "none", background: "#eef4fb", color: "#6b8299", borderRadius: 999,
    width: 30, height: 30, cursor: "pointer", fontWeight: 900, fontFamily: FONT,
  },

  /* ── سطر إعداد ── */
  settingRow: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    gap: 18, padding: "14px 12px", borderRadius: 12, flexWrap: "wrap",
  },
  settingText: { display: "flex", flexDirection: "column", gap: 3, minWidth: 240, flex: 1 },
  settingLabel: { fontWeight: 800, lineHeight: 1.5 },
  settingHint: { color: "#8aa3b8", fontWeight: 700, lineHeight: 1.5 },
  settingCtl: { display: "flex", alignItems: "center", gap: 10, flexShrink: 0 },
  rows: { display: "flex", flexDirection: "column", gap: 2 },
  sigRow: { display: "flex", alignItems: "flex-end", gap: 12, flexWrap: "wrap" },

  danger: {
    marginTop: 8, border: "1.5px solid #f3d4d4", background: "#fffafa",
    borderRadius: 16, padding: 16, display: "flex", flexDirection: "column",
    gap: 8, alignItems: "flex-start",
  },
  dangerTitle: { fontWeight: 900, color: "#a12626" },
  dangerText: { color: "#8a6a6a", fontWeight: 700, lineHeight: 1.7 },
  dangerBtn: {
    border: "none", background: "#a12626", color: "#fff", borderRadius: 12,
    padding: "11px 20px", fontWeight: 800, fontFamily: FONT, cursor: "pointer",
  },
  numWrap: { display: "flex", alignItems: "center", gap: 8 },
  unit: { color: "#8aa3b8", fontWeight: 800, whiteSpace: "nowrap" },
  empty: {
    background: "#f7fbff", border: "2px dashed #cfe0f0", borderRadius: 14,
    padding: "26px 18px", textAlign: "center", fontWeight: 800, color: "#6b8299",
  },

  /* ── شريط الحفظ العائم ── */
  saveDock: {
    position: "fixed", insetInlineStart: 0, insetInlineEnd: 0, bottom: 18,
    display: "flex", justifyContent: "center", zIndex: 60, pointerEvents: "none",
    padding: "0 14px",
  },
  saveBar: {
    pointerEvents: "auto",
    display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap",
    background: "#14507f", color: "#fff", borderRadius: 16,
    padding: "12px 16px", boxShadow: "0 18px 40px rgba(15,39,64,.32)",
    maxWidth: "min(760px, 100%)",
  },
  saveBarBad: { background: "#8e1f1f" },
  saveMsg: { fontWeight: 900 },
  saveBtns: { display: "flex", gap: 10, marginInlineStart: "auto", flexWrap: "wrap" },

  /* الماستر ليست — روابط (وليست أزرار) حتى تشتغل داخل fieldset المعطّل */
  masterBtn: {
    background: "#b45309", color: "#fff", border: "none", borderRadius: 12,
    padding: "12px 20px", fontWeight: 800, fontFamily: FONT,
    textDecoration: "none", whiteSpace: "nowrap", display: "inline-block",
    alignSelf: "flex-start",
  },
  treeGrid: {
    display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(200px,100%),1fr))",
    gap: 14, margin: "16px 0",
  },
  treeCard: {
    border: "1px solid #e3edf7", borderRadius: 16, padding: "20px 14px",
    background: "#fbfdff", textDecoration: "none", color: "#0f2740",
    display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
  },
  treeIcon: { fontSize: 34, lineHeight: 1 },
  treeName: { fontWeight: 900, color: "#14507f" },
  treeCount: { color: "#8aa3b8", fontWeight: 800 },

  blockers: {
    background: "#fff1f1", border: "1px solid #f5c2c2", color: "#a12626",
    borderRadius: 14, padding: "12px 16px",
    fontWeight: 800, lineHeight: 1.7,
  },

  /* حاوية الأقسام — fieldset بلا مظهر، وجودها فقط لتعطيل الحقول عند العرض فقط */
  panels: { border: 0, padding: 0, margin: 0, minWidth: 0 },

  card: {
    background: "#fff", border: "1px solid #e3edf7", borderRadius: 20,
    padding: "20px 18px", display: "flex", flexDirection: "column", gap: 14,
    boxShadow: "0 10px 26px rgba(15,39,64,.05)",
  },
  cardHead: {
    display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap",
    paddingBottom: 14, borderBottom: "1px solid #eef4fb",
  },
  cardIcon: {
    width: 44, height: 44, borderRadius: 14, flexShrink: 0,
    display: "grid", placeItems: "center", background: "#eef4fb", fontSize: 21,
  },
  cardTitle: { margin: 0, fontWeight: 900, color: "#14507f", lineHeight: 1.3 },
  cardSub: { color: "#8aa3b8", fontWeight: 700, marginTop: 2, lineHeight: 1.5 },
  secTitle: {
    fontWeight: 900, color: "#14507f",
    paddingBottom: 10, borderBottom: "2px solid #eef4fb",
  },
  rowField: {
    display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16,
    padding: "14px 0", borderTop: "1px solid #f0f5fa", fontWeight: 700, flexWrap: "wrap",
  },
  rowLabel: { flex: 1, lineHeight: 1.55 },
  note: {
    color: "#5c7a94", fontWeight: 700, lineHeight: 1.8,
    background: "#f7fbff", border: "1px solid #e6eff8", borderRadius: 12,
    padding: "12px 14px",
  },

  tableWrap: {
    overflowX: "auto", WebkitOverflowScrolling: "touch",
    border: "1px solid #e3edf7", borderRadius: 14, background: "#fff",
    maxHeight: "72vh", overflowY: "auto",
  },
  table: { width: "100%", borderCollapse: "separate", borderSpacing: 0, minWidth: 980 },
  th: {
    background: "#f2f7fc", color: "#14507f", fontWeight: 900,
    padding: "14px 12px", textAlign: "center", whiteSpace: "nowrap",
    borderBottom: "1px solid #dbe6f2",
  },
  td: {
    padding: "12px 10px", borderTop: "1px solid #eef4fa",
    textAlign: "center", verticalAlign: "middle",
  },
  input: {
    border: "1.5px solid #cfe0f0", borderRadius: 10, padding: "11px 13px", minWidth: 160,
    fontWeight: 700, fontFamily: FONT, color: "#0f2740", background: "#fff", outline: "none",
    width: "100%", boxSizing: "border-box",
  },
  inputSm: {
    border: "1.5px solid #cfe0f0", borderRadius: 10, padding: "11px 10px", width: 104,
    fontWeight: 800, fontFamily: FONT, color: "#0f2740", background: "#fff",
    outline: "none", textAlign: "center",
  },
  artCell: { display: "block", width: 60, height: 60, margin: "0 auto" },
  artWrap: { display: "flex", flexDirection: "column", alignItems: "center", gap: 6 },
  artImg: {
    width: "100%", height: "100%", objectFit: "cover",
    borderRadius: 8, border: "1px solid #dbe6f2", background: "#fff", display: "block",
  },
  artNone: { color: "#c3d4e6", fontWeight: 900, display: "grid", placeItems: "center", height: "100%" },
  artUpload: {
    border: "1.5px dashed #9fc6ea", background: "#f2f8ff", color: "#14507f",
    borderRadius: 10, padding: "8px 14px", fontWeight: 800, fontFamily: FONT,
    cursor: "pointer", whiteSpace: "nowrap",
  },
  artClear: {
    border: "1.5px solid #f5c2c2", background: "#fff", color: "#a12626",
    borderRadius: 10, padding: "8px 14px", fontWeight: 800, fontFamily: FONT,
    cursor: "pointer", whiteSpace: "nowrap", marginTop: 4,
  },
  linkBtn: {
    border: "none", background: "transparent", color: "#1f6fd0",
    fontWeight: 800, fontFamily: FONT, cursor: "pointer", padding: 0,
  },
  historyBox: {
    marginTop: 6, textAlign: "start", background: "#f7fbff",
    border: "1px solid #e3edf7", borderRadius: 10, padding: 8,
    maxHeight: 190, overflowY: "auto", minWidth: 240,
  },
  historyRow: {
    padding: "5px 0", borderTop: "1px solid #eaf2fa", fontWeight: 700, lineHeight: 1.6,
  },
  branchBox: {
    border: "1px solid #dbe6f2", borderRadius: 14, padding: 12,
    display: "flex", flexDirection: "column", gap: 10, background: "#fbfdff",
  },
  branchBoxBad: { borderColor: "#f5c2c2", background: "#fff7f7" },
  branchHead: { display: "flex", alignItems: "flex-end", gap: 12, flexWrap: "wrap" },
  branchArt: { display: "block", width: 40, height: 40, flexShrink: 0 },
  branchName: { fontWeight: 900, color: "#14507f" },
  branchCount: {
    background: "#dceaf8", color: "#14507f", borderRadius: 999,
    padding: "3px 12px", fontWeight: 800,
  },
  dupWarn: {
    background: "#fff1f1", border: "1px solid #f5c2c2", color: "#a12626",
    borderRadius: 10, padding: "8px 12px", fontWeight: 800,
  },
  tag: {
    display: "inline-block", background: "#eef4fb", border: "1px solid #dbe6f2",
    borderRadius: 999, padding: "1px 8px", marginTop: 3, color: "#6b8299", fontWeight: 800,
  },
  orderBtns: { display: "flex", flexDirection: "column", gap: 2 },
  orderBtn: {
    border: "1px solid #cfe0f0", background: "#fff", color: "#3c5a75",
    borderRadius: 6, padding: "0 6px", cursor: "pointer", fontFamily: FONT, lineHeight: 1.4,
  },
  grid2: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(240px,100%),1fr))", gap: 12 },
  logoPreview: {
    height: 46, maxWidth: 190, objectFit: "contain",
    border: "1px solid #dbe6f2", borderRadius: 8, background: "#fff", padding: 4,
  },
  codeWrap: { position: "relative", minWidth: 190 },
  codeInput: {
    border: "1.5px solid #cfe0f0", borderRadius: 10, padding: "11px 13px",
    fontWeight: 800, fontFamily: FONT, color: "#0f2740", background: "#fff",
    outline: "none", width: "100%", boxSizing: "border-box", textAlign: "center",
    letterSpacing: "0.02em",
  },
  codeDesc: {
    marginTop: 5, color: "#3c5a75", fontWeight: 700, lineHeight: 1.4,
    background: "#f2f8ff", border: "1px solid #dbe6f2", borderRadius: 8,
    padding: "4px 8px", textAlign: "start",
  },
  codeWarn: { marginTop: 5, color: "#a12626", fontWeight: 800 },
  codeList: {
    position: "absolute", zIndex: 30, insetInlineStart: 0, top: "100%",
    background: "#fff", border: "1px solid #cfe0f0", borderRadius: 12,
    boxShadow: "0 16px 34px rgba(15,39,64,.18)", minWidth: 380, maxHeight: 320,
    overflowY: "auto", textAlign: "start", marginTop: 4,
  },
  codeOpt: {
    display: "block", width: "100%", textAlign: "start", border: "none",
    background: "transparent", padding: "11px 13px", cursor: "pointer",
    fontFamily: FONT, color: "#0f2740", borderBottom: "1px solid #f2f7fc",
    fontWeight: 700, lineHeight: 1.45,
  },
  codeBad: { border: "2px solid #f5c2c2", background: "#fff7f7" },
  animalBar: {
    display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center",
    background: "#f7fbff", border: "1px solid #e6eff8", borderRadius: 14, padding: "12px 14px",
  },
  animalBarLbl: { fontWeight: 900, color: "#6b8299" },
  animalPick: {
    border: "1.5px solid #cfe0f0", background: "#fff", color: "#14507f",
    borderRadius: 999, padding: "10px 22px", fontWeight: 900, fontFamily: FONT, cursor: "pointer",
  },
  animalPickOn: {
    background: "#14507f", color: "#fff", border: "1.5px solid #14507f",
    boxShadow: "0 8px 18px rgba(20,80,127,.24)",
  },
  originPicks: { display: "flex", gap: 8, flexWrap: "wrap" },
  originPick: {
    display: "inline-flex", alignItems: "center", gap: 6,
    border: "1.5px solid #e3ebf3", borderRadius: 999, padding: "7px 14px",
    fontWeight: 800, color: "#8aa3b8", cursor: "pointer",
  },
  originPickOn: { borderColor: "#9fc6ea", background: "#f2f8ff", color: "#14507f" },
  rowBtns: { display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" },
  openBtn: {
    border: "1.5px solid #bfdbfe", background: "#eff6ff", color: "#1d4ed8",
    borderRadius: 10, padding: "10px 18px", fontWeight: 800, fontFamily: FONT,
    cursor: "pointer", whiteSpace: "nowrap",
  },
  del: {
    border: "1.5px solid #f5c2c2", background: "#fff", color: "#a12626",
    borderRadius: 10, padding: "10px 18px", fontWeight: 800, fontFamily: FONT,
    cursor: "pointer", whiteSpace: "nowrap",
  },
};
