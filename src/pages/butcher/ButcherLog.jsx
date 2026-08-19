// src/pages/butcher/ButcherLog.jsx
//
// صفحة الجزار — تسجيل أوزان التقطيع / Butcher cut log (EN/AR).
//
// الخطوات (كشك لمس، كروت كبيرة برسمات):
//   الرقم الوظيفي + الملحمة → النوع → المنشأ →
//   [الخروف فقط] شاشة فيها كرت "خروف كامل" منفصل فوق + 6 قطع مفردة تحته:
//      • خروف كامل → وزن الذبيحة → شبكة القطع العشرة → حفظ
//      • قطع مفردة → وزن وهدر لكل قطعة → حفظ (بلا وزن ذبيحة)
//   وباقي الأنواع تدخل مسار الذبيحة الكاملة مباشرة.
// لوحة النِّسب المرجعية (REF_PCT) بجانب الشبكة تقارن الفعلي بالمتوقّع.
//
// الشروط:
//   • مجموع (القطع + الهدر والعضم) لا يتجاوز وزن الذبيحة → يمنع الحفظ.
//   • وزن ذبيحة خارج المدى المعقول لنوعها → تحذير فقط (ANIMALS.min/max).
//
// ملاحظات تقنية:
//   • الحفظ يمرّ بصندوق الصادر (butcherOutbox): يذهب للسيرفر فوراً، وإن كان
//     النت مقطوعاً ينتظر محلياً ويُرفع تلقائياً عند عودة الاتصال.
//   • السيرفر هو مصدر الحقيقة — كل ذبيحة سجل واحد فيه مصفوفة cuts عبر
//     POST /api/reports بنوع butcher_cut_log. الـ localStorage للكاش فقط.
//   • UNIQUE على (type, payload->>'reportDate') لكل الأنواع ما عدا maintenance،
//     لذلك reportDate = طابع وقت ISO فريد لكل تسجيل، مع حقل date لليوم،
//     وإعادة محاولة عند 409.
//   • أحجام الخطوط عبر <style> بكلاسات لا inline: globals.css فيه
//     `#root * { font-size:14px !important }` ويدهس أي fontSize inline.

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import ButcherArt, { ART_IDS } from "./ButcherIcons";
import { BRANCHES, altNameOf, branchCodeFromLabel, nameOf } from "./butcherOptions";
import { artOf, butcherByNo, imageOf, roundKg, useButcherConfig } from "./butcherConfig";
import {
  useMrpConfig, bomInputItem, bomLines, itemName,
  bomCategoriesForPicker, bomsInCategory, UNCAT,
  bomIsMultiPath, activePathwaysOf,
} from "./butcherMrpBridge";
import { saveOrQueue, useOutbox } from "./butcherOutbox";
import { progressPct, useDayPlan } from "./butcherDayPlan";
import { useSettingsLang, LangToggle } from "../settings/_shared/settingsI18n";
import { canOpenButcherPage, NoAccess } from "./ButcherAccess";
// سجل الموظفين المشترك (نفس المصدر الذي يستعمله رابط التدريب الداخلي) — قراءة فقط
import { EMPLOYEES } from "../ohc/OHCUpload";

const LAST_EMP_KEY = "butcher_last_emp";       // cache only — not a store
const LAST_BRANCH_KEY = "butcher_last_branch"; // cache only — not a store

/* أحجام الخطوط — تتغلّب على `#root *` بفضل الكلاس (نفس التخصيص + ترتيب لاحق) */
const CSS = `
#root .bt, #root .bt * { font-size: 28px !important; }
#root .bt-title   { font-size: 34px !important; }
#root .bt-q       { font-size: 32px !important; }
#root .bt-emp     { font-size: 28px !important; }
#root .bt-chip    { font-size: 26px !important; }
#root .bt-name    { font-size: 32px !important; }
#root .bt-num     { font-size: 42px !important; }
#root .bt-cutnum  { font-size: 30px !important; }
#root .bt-lbl     { font-size: 24px !important; }
#root .bt-btn     { font-size: 32px !important; }
#root .bt-back    { font-size: 28px !important; }
#root .bt-sum     { font-size: 26px !important; }
#root .bt-small   { font-size: 22px !important; }
#root .bt-done    { font-size: 64px !important; }
#root .bt-toggle, #root .bt-toggle * { font-size: 20px !important; }
#root .bt-ref, #root .bt-ref * { font-size: 20px !important; }
#root .bt-ref-title { font-size: 24px !important; }
/* عمودان على الشاشات العريضة: الكروت + لوحة النِّسب المرجعية */
#root .bt-2col { display: grid; grid-template-columns: 1fr; gap: 18px; align-items: start; }
@media (min-width: 1200px) {
  #root .bt-2col { grid-template-columns: 1fr 340px; }
  #root .bt-aside { position: sticky; top: 12px; }
}
/* ═══ الموبايل: أحجام أصغر ومساحات أضيق ═══ */
@media (max-width: 820px) {
  #root .bt, #root .bt * { font-size: 20px !important; }
  #root .bt-title  { font-size: 24px !important; }
  #root .bt-q      { font-size: 22px !important; }
  #root .bt-name   { font-size: 22px !important; }
  #root .bt-num    { font-size: 32px !important; }
  #root .bt-cutnum { font-size: 24px !important; }
  #root .bt-lbl    { font-size: 17px !important; }
  #root .bt-btn    { font-size: 22px !important; }
  #root .bt-emp, #root .bt-chip, #root .bt-sum, #root .bt-back { font-size: 18px !important; }
  #root .bt-small  { font-size: 15px !important; }
  #root .bt-done   { font-size: 48px !important; }
  #root .bt-ref, #root .bt-ref * { font-size: 17px !important; }
  #root .bt-ref-title { font-size: 20px !important; }
  /* شريط الخطوات: أرقام فقط بلا أسماء */
  #root .bt-step-lbl { display: none !important; }
}
@media (max-width: 520px) {
  #root .bt-toggle { display: none; }   /* زر اللغة يضيّق الترويسة على الجوال */
}
/* حركات خفيفة */
#root .bt-press { transition: transform .12s ease, box-shadow .12s ease, border-color .15s ease; }
#root .bt-press:active { transform: scale(.97); }
@keyframes btPop { 0% { transform: scale(.6); opacity: 0 } 60% { transform: scale(1.12) } 100% { transform: scale(1); opacity: 1 } }
#root .bt-pop { animation: btPop .45s cubic-bezier(.22,1,.36,1) both; }
@keyframes btRise { from { opacity: 0; transform: translateY(14px) } to { opacity: 1; transform: none } }
#root .bt-rise { animation: btRise .28s ease both; }
`;

/** هل الصفحة مفتوحة من داخل الحساب (لا من جهاز الكشك)؟ */
function hasSession() {
  try {
    return !!localStorage.getItem("currentUser");
  } catch {
    return false;
  }
}

/* ============================ أدوات ============================ */

const todayStr = () => new Date().toISOString().slice(0, 10);

/** تاريخ ووقت للعرض — YYYY-MM-DD · HH:MM (بالتوقيت المحلي). */
function stampStr(d) {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} · ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** رقم من إدخال المستخدم — يقبل الفاصلة العربية/اللاتينية. */
function num(v) {
  const n = Number(String(v ?? "").replace(",", ".").trim());
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/* ============================ الصفحة ============================ */

export default function ButcherLog() {
  const navigate = useNavigate();
  const { t, isAr, dir, lang, toggle } = useSettingsLang();
  const { cfg } = useButcherConfig();
  const { cfg: mrpCfg } = useMrpConfig({ refetchOnFocus: false });
  // صندوق الصادر — الحفظ يشتغل حتى لو النت مقطوع، ويزامن لحاله
  const outbox = useOutbox();
  const isLoggedIn = hasSession();

  /* الشروط من إعدادات الجزار — المنتجات صارت من قوائم التقطيع (MRP Cutting BOMs) */
  const RULES = cfg.rules;
  // إظهار النسبة الفعلية تحت كل خانة (نسبة الرقم من وزن المادة الخام)
  const showPct = RULES.showActualPct !== false;

  /* فئات الوصفات لشاشة الاختيار — فئات فيها وصفات + «بلا فئة» إن وُجدت */
  const catPick = useMemo(() => bomCategoriesForPicker(mrpCfg), [mrpCfg]);
  const hasCatStep = catPick.cats.length > 0;

  // emp | category | bom | cuts | done
  const [step, setStep] = useState("emp");
  const [empNo, setEmpNo] = useState("");
  const [branch, setBranch] = useState("");
  const [bomCat, setBomCat] = useState(null);   // الفئة المختارة (null=الكل، UNCAT=بلا فئة)
  const [bom, setBom] = useState(null);         // قائمة التقطيع المختارة
  const [pathwayId, setPathwayId] = useState(""); // المسار المختار (وضع المسارات المتعددة)
  const [carcass, setCarcass] = useState("");   // وزن المادة الخام قبل التقطيع
  const [pieceCount, setPieceCount] = useState(""); // عدد القطع (إن طلبته الوصفة)
  const [values, setValues] = useState({});     // { itemId: { w } }
  const [bomSearch, setBomSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [saved, setSaved] = useState(null);     // ملخّص آخر حفظ
  const [cutDate, setCutDate] = useState(todayStr());  // تاريخ التقطيع (يختاره الجزار)
  // تاريخ إدخال البيانات — لحظة فتح الشاشة، ويُثبَّت وقت الحفظ
  const [entryAt] = useState(() => new Date());

  useEffect(() => {
    try {
      const lastEmp = localStorage.getItem(LAST_EMP_KEY);
      const lastBranch = localStorage.getItem(LAST_BRANCH_KEY);
      if (lastEmp) setEmpNo(lastEmp);
      if (lastBranch) setBranch(lastBranch);
    } catch { /* ignore */ }
  }, []);


  /* بطاقة الموظف: سجل الجزارين (الإعدادات) أولاً، ثم سجل الموظفين المشترك */
  const butcherRec = useMemo(() => butcherByNo(cfg, empNo), [cfg, empNo]);
  const dirRec = useMemo(() => EMPLOYEES[String(empNo || "").trim()] || null, [empNo]);

  const person = useMemo(() => {
    const name = butcherRec?.name || dirRec?.name || "";
    if (!name && !dirRec) return null;
    return {
      name,
      job: dirRec?.job || "",
      branchLabel: dirRec?.branch || "",
      branchCode: butcherRec?.branch || branchCodeFromLabel(dirRec?.branch),
    };
  }, [butcherRec, dirRec]);

  const knownButcher =
    (!!butcherRec && butcherRec.active !== false) || (!butcherRec && !!dirRec);
  const butcherBlocked = RULES.restrictButchers === true && !!empNo.trim() && !knownButcher;

  /* تعبئة الملحمة تلقائياً من سجل الموظف — بلا دهس اختيار المستخدم */
  const branchTouched = useRef(false);
  useEffect(() => {
    if (branchTouched.current) return;
    if (!person?.branchCode || branch) return;
    setBranch(person.branchCode);
  }, [person, branch]);

  const branchObj = useMemo(
    () => BRANCHES.find((b) => b.code === branch) || null,
    [branch]
  );

  /* خطة اليوم لهذه الملحمة + تقدّم الجزار — طلب واحد يخدم الاثنين.
     لا نحمّل قبل ما يدخل الجزار حتى لا نسحب بيانات بلا داعٍ. */
  const dayPlan = useDayPlan({
    date: todayStr(),
    branch: step === "emp" ? "" : branch,
    employeeNo: step === "emp" ? "" : empNo,
  });
  // ملخّص الجزار اليوم — من نفس نتيجة الخطة بدل طلب ثانٍ بـ٥٠٠٠ سجل
  const totals = dayPlan.progress?.mine
    ? { count: dayPlan.progress.mine.count, kg: dayPlan.progress.mine.productsKg }
    : null;

  /* الوصفات المعروضة = وصفات الفئة المختارة */
  const shownBoms = useMemo(() => bomsInCategory(mrpCfg, bomCat), [mrpCfg, bomCat]);
  /* اسم الفئة المختارة للعرض */
  const bomCatName = useMemo(() => {
    if (!bomCat) return "";
    if (bomCat === UNCAT) return isAr ? "بلا فئة" : "Uncategorized";
    return nameOf(catPick.cats.find((c) => c.id === bomCat) || {}, isAr);
  }, [bomCat, catPick, isAr]);

  /* ── المادة الخام ونواتج الوصفة من قائمة التقطيع المختارة ── */
  const inputItem = useMemo(() => (bom ? bomInputItem(mrpCfg, bom) : null), [mrpCfg, bom]);

  /* المسارات المتعددة: الجزار يختار المسار، والنواتج/الهدر تُقرأ من المسار لا من الوصفة المسطّحة. */
  const isMultiPath = bomIsMultiPath(bom);
  const activePathways = useMemo(() => activePathwaysOf(bom), [bom]);
  const pathway = useMemo(
    () => (isMultiPath ? activePathways.find((p) => p.id === pathwayId) || null : null),
    [isMultiPath, activePathways, pathwayId]
  );
  // مصدر الأسطر: المسار المختار في وضع المسارات، وإلا الوصفة نفسها (bomLines يقرأ .outputs/.wastes من أي مصدر).
  const lineSource = isMultiPath ? pathway : bom;
  const bomOutputs = useMemo(() => (lineSource ? bomLines(mrpCfg, lineSource, "outputs") : []), [mrpCfg, lineSource]);
  const bomWastes = useMemo(() => (lineSource ? bomLines(mrpCfg, lineSource, "wastes") : []), [mrpCfg, lineSource]);

  /* المنتجات = نواتج الوصفة فقط ، والهدر = هدر الوصفة */
  const productCuts = useMemo(() => bomOutputs, [bomOutputs]);
  const wasteCuts = useMemo(() => bomWastes, [bomWastes]);
  const ALL = useMemo(() => [...productCuts, ...wasteCuts], [productCuts, wasteCuts]);

  /* مجاميع الشاشة الحالية — المفتاح معرّف الصنف */
  const carcassKg = num(carcass);
  const filled = useMemo(
    () =>
      ALL.map((c) => ({
        cut: c,
        kind: c.kind,
        weightKg: num(values[c.id]?.w),
      })).filter((x) => x.weightKg > 0),
    [values, ALL]
  );
  const cutsKg = filled.reduce((s, x) => s + (x.kind === "product" ? x.weightKg : 0), 0);
  const wasteOnlyKg = filled.reduce((s, x) => s + (x.kind !== "product" ? x.weightKg : 0), 0);
  const wasteKg = wasteOnlyKg;
  const cutCount = filled.filter((x) => x.kind === "product").length;

  const usedKg = cutsKg + wasteKg;
  const remainingKg = carcassKg - usedKg;
  const overKg = usedKg - carcassKg;
  // شرط قابل للإطفاء من لوحة الإعدادات، مع سماحية تقريب قابلة للتعديل
  const isOver =
    RULES.blockOverCarcass !== false && overKg > (Number(RULES.toleranceKg) || 0.05);

  /* النِّسب من وزن المادة الخام */
  const pctOf = useCallback(
    (v) => (carcassKg > 0 ? (v / carcassKg) * 100 : 0),
    [carcassKg]
  );
  const netYieldPct = pctOf(cutsKg);   // نسبة التصافي
  const wastePct = pctOf(wasteKg);     // نسبة الهدر

  /* الوزن المستهدف لسطر — منسوب لوزن المادة الخام الفعلي (من نسبة الوصفة) */
  const inputQty = num(bom?.inputQty);
  const targetKgOf = useCallback(
    (line) => {
      const tq = num(line?.targetQty);
      if (!(tq > 0)) return 0;
      return carcassKg > 0 && inputQty > 0 ? tq * (carcassKg / inputQty) : tq;
    },
    [carcassKg, inputQty]
  );

  // الهدر إلزامي = لازم خانة الهدر تنعبّى إن وُجد صنف هدر في الوصفة
  const wasteMissing =
    RULES.requireWaste === true && wasteCuts.length > 0 && wasteOnlyKg <= 0;

  /* تطابق تام مطلوب لهالوصفة: الخام = النواتج + الهدر (بلا فاقد ولا زيادة) */
  const exactBalance = bom?.requireExactBalance === true;
  const balanceDiff = carcassKg - usedKg;             // + = ناقص ، − = زايد
  // epsilon زغير للفواصل العشرية فقط — التطابق تام
  const balanceOff = exactBalance && (carcassKg <= 0 || Math.abs(balanceDiff) > 1e-6);

  /* منع التجاوز فوق وزن الخام مربوط بالتطابق التام:
     - «التطابق التام» مفعّل → التجاوز ممنوع (لازم يساوي تماماً).
     - «التطابق التام» مطفي → التجاوز مسموح (لأسباب تشغيلية) ويبقى تحذير بصري فقط. */
  const overBlocks = isOver && exactBalance;

  /* عدد القطع — تطلبه بعض الوصفات فقط */
  const needPieces = bom?.requirePieceCount === true;
  const pieceCountNum = Math.floor(num(pieceCount));
  const pieceMissing = needPieces && !(pieceCountNum > 0);

  const canSave =
    filled.length > 0 && usedKg > 0 && !overBlocks && !wasteMissing && !balanceOff && !pieceMissing;

  /* ------- الانتقالات ------- */

  const startWithEmp = () => {
    const emp = empNo.trim();
    if (!emp || butcherBlocked) return;
    if (RULES.requireBranch !== false && !branch) return;
    try {
      localStorage.setItem(LAST_EMP_KEY, emp);
      localStorage.setItem(LAST_BRANCH_KEY, branch);
    } catch { /* ignore */ }
    setEmpNo(emp);
    // في فئات وصفات؟ ابدأ باختيار الفئة، وإلا اعرض كل الوصفات مباشرة
    setBomCat(null);
    setStep(hasCatStep ? "category" : "bom");
    dayPlan.reload();
  };

  /* اختيار فئة الوصفات → عرض وصفات هذه الفئة فقط */
  const pickCategory = (id) => {
    setBomCat(id);
    setBom(null);
    setBomSearch("");
    setStep("bom");
  };

  /* اختيار وصفة التقطيع → المسار (لو متعددة) وإلا صفحة الأوزان مباشرة */
  const pickBom = (b) => {
    setBom(b);
    setCarcass("");
    setPieceCount("");
    setValues({});
    setPathwayId("");
    setError("");
    const paths = activePathwaysOf(b);
    if (bomIsMultiPath(b)) {
      // مسار واحد فعّال؟ اختَره تلقائياً وروح للأوزان. أكثر من واحد؟ اعرض شاشة الاختيار.
      if (paths.length === 1) { setPathwayId(paths[0].id); setStep("cuts"); }
      else { setStep("pathway"); }
    } else {
      setStep("cuts");
    }
  };

  /* اختيار المسار → صفحة الأوزان (نواتج/هدر هذا المسار) */
  const pickPathway = (p) => {
    setPathwayId(p.id);
    setValues({});       // الأسطر تتغيّر حسب المسار — صفّر الأوزان
    setError("");
    setStep("cuts");
  };

  const setVal = (cutId, key, v) =>
    setValues((prev) => ({ ...prev, [cutId]: { ...prev[cutId], [key]: v } }));

  const save = async () => {
    if (!canSave || saving) return;
    setSaving(true);
    setError("");
    try {
      const payload = {
        employeeNo: empNo,
        branch,                                   // كود الملحمة/الفرع
        branchAr: branchObj?.ar || "",
        branchEn: branchObj?.en || "",
        // ── الوصفة (قائمة التقطيع) والمادة الخام ──
        bomId: bom?.id || "",
        bomRef: bom?.ref || "",
        bomCategoryId: bom?.categoryId || "",
        // ── المسار المختار (وضع المسارات المتعددة) ──
        pathwayId: pathway?.id || "",
        pathwayCode: pathway?.code || "",
        pathwayName: pathway?.name || "",
        inputItemId: bom?.inputId || "",
        inputSku: inputItem?.sku || "",
        animal: inputItem?.ar || "",              // توافق مع View/Summary القديمة
        animalEn: inputItem?.en || "",
        carcassWeightKg: carcassKg,               // وزن المادة الخام قبل التقطيع
        pieceCount: needPieces ? pieceCountNum : null,   // عدد القطع (إن طلبته الوصفة)
        mode: "bom",
        cuts: filled.map((x) => ({
          itemId: x.cut.itemId,
          cutId: x.cut.itemId,          // توافق مع الشاشات القديمة
          cut: x.cut.ar,
          cutEn: x.cut.en,
          kind: x.kind,                 // product | waste
          code: x.cut.sku || "",
          sku: x.cut.sku || "",
          uom: x.cut.uom || "",
          weightKg: roundKg(x.weightKg, RULES.roundTo),
          targetKg: Number(targetKgOf(x.cut).toFixed(3)),
          wasteBoneKg: 0,
          pctOfCarcass: Number(pctOf(x.weightKg).toFixed(2)),
        })),
        cutsTotalKg: Number(cutsKg.toFixed(3)),
        wasteBoneTotalKg: Number(wasteKg.toFixed(3)),
        netYieldPct: Number(netYieldPct.toFixed(2)),  // نسبة التصافي
        wastePct: Number(wastePct.toFixed(2)),        // نسبة الهدر
        wasteTotalKg: Number(wasteOnlyKg.toFixed(3)),
        boneTotalKg: 0,
        // تاريخ التقطيع — هو تاريخ السجل المعتمد بالتقارير
        date: RULES.allowBackdate === true ? cutDate : todayStr(),
        cutDate: RULES.allowBackdate === true ? cutDate : todayStr(),
        // تاريخ إدخال البيانات — لحظة الحفظ الفعلية
        entryDate: todayStr(),
        entryAt: new Date().toISOString(),
        butcherName: person?.name || "",
        butcherJob: person?.job || "",
        savedAt: new Date().toISOString(),
      };
      // يذهب للسيرفر فوراً، وإن كان النت مقطوعاً يدخل صندوق الصادر ويُزامن لاحقاً
      const res = await saveOrQueue(payload);
      setSaved({
        animal: itemName(inputItem, isAr),
        origin: bom?.ref || "",
        carcassKg, cutsKg, wasteKg, count: cutCount, netYieldPct, wastePct,
        pieceCount: needPieces ? pieceCountNum : null,
        cutDate: RULES.allowBackdate === true ? cutDate : todayStr(),
        entryStamp: stampStr(new Date()),
        queued: res.queued === true,
      });
      setStep("done");
      dayPlan.reload();
    } catch (e) {
      setError(e?.message || t({ en: "Save failed", ar: "فشل الحفظ" }));
    } finally {
      setSaving(false);
    }
  };

  const newEntry = () => {
    setCutDate(todayStr());
    setBomCat(null);
    setBom(null);
    setCarcass("");
    setPieceCount("");
    setValues({});
    setPathwayId("");
    setBomSearch("");
    setError("");
    setSaved(null);
    setStep(hasCatStep ? "category" : "bom");
  };

  const back = () => {
    if (step === "category") { setStep("emp"); return; }
    if (step === "bom") { setStep(hasCatStep ? "category" : "emp"); return; }
    if (step === "pathway") { setStep("bom"); return; }
    // من الأوزان: ارجع للمسار لو الوصفة متعددة المسارات، وإلا للوصفة
    if (step === "cuts") { setStep(isMultiPath ? "pathway" : "bom"); return; }
  };

  const KG = t({ en: "kg", ar: "كجم" });

  // الكشك (بلا حساب) يمرّ دائماً — isItemAllowed ترجع true بلا قائمة تقييد
  if (!canOpenButcherPage("butcher.entry")) return <NoAccess page="butcher.entry" />;

  /* ------- العرض ------- */

  return (
    <div dir={dir} className="bt" style={S.page}>
      <style>{CSS}</style>
      <div style={{ ...S.wrap, ...(step === "cuts" ? S.wrapWide : null) }}>
        <div style={S.header}>
          <div className="bt-title" style={S.title}>
            🔪 {t({ en: "Butcher", ar: "الجزار" })}
          </div>
          <div style={S.headerRight}>
            {/* حالة الاتصال والمزامنة — تظهر فقط لما يكون في شي يستحق الانتباه */}
            {(!outbox.online || outbox.pending > 0) && (
              <button
                type="button"
                className="bt-small"
                onClick={outbox.sync}
                disabled={outbox.syncing || !outbox.online}
                style={{
                  ...S.syncChip,
                  ...(outbox.online ? S.syncPending : S.syncOffline),
                }}
                title={t({ en: "Sync now", ar: "زامن الآن" })}
              >
                {!outbox.online
                  ? `📴 ${t({ en: "Offline", ar: "بلا إنترنت" })}${outbox.pending ? ` · ${outbox.pending}` : ""}`
                  : outbox.syncing
                    ? `⏳ ${t({ en: "Syncing…", ar: "جارٍ المزامنة…" })}`
                    : `📤 ${outbox.pending} ${t({ en: "unsynced", ar: "غير مُزامن" })}`}
              </button>
            )}
            <span className="bt-toggle">
              <LangToggle lang={lang} toggle={toggle} style={S.langBtn} />
            </span>
            {step === "emp" && isLoggedIn && (
              <button className="bt-small" style={S.chg} onClick={() => navigate("/butcher")}>
                {t({ en: "Back to section", ar: "رجوع للقسم" })}
              </button>
            )}
            {step !== "emp" && (
              <div className="bt-emp" style={S.emp}>
                {empNo}
                <button className="bt-small" style={S.chg} onClick={() => setStep("emp")}>
                  {t({ en: "Change", ar: "تغيير" })}
                </button>
              </div>
            )}
          </div>
        </div>

        {step !== "emp" && step !== "done" && (
          <StepBar step={step} hasCat={hasCatStep} hasPath={isMultiPath} t={t} />
        )}

        {/* تعذّر تحميل الخطة/التقدّم — نقولها بدل ما يختفي الشريط بلا سبب.
            التسجيل نفسه غير متأثّر، فنطمئن الجزار على ذلك صراحةً. */}
        {step !== "emp" && step !== "done" && dayPlan.error && (
          <div className="bt-sum" style={S.planWarn}>
            ⚠️ {t({
              en: "Today's figures could not be loaded, so the plan bar is out of date. Recording works normally.",
              ar: "ما قدرنا نحمّل أرقام اليوم، فشريط الخطة مش محدّث. التسجيل شغّال عادي.",
            })}{" "}
            <button type="button" className="bt-small" style={S.chg} onClick={dayPlan.reload}>
              ↻ {t({ en: "Try again", ar: "إعادة المحاولة" })}
            </button>
          </div>
        )}

        {/* ── خطة اليوم: هدف الملحمة والتقدّم عليه ── */}
        {step !== "emp" && dayPlan.plan && dayPlan.progress && (
          <DayPlanBar
            plan={dayPlan.plan}
            progress={dayPlan.progress}
            branchName={branchObj ? nameOf(branchObj, isAr) : ""}
            KG={KG}
            t={t}
          />
        )}

        {step !== "emp" && step !== "done" && totals && (
          <div className="bt-chip" style={S.totals}>
            {t({ en: "Today", ar: "اليوم" })}: {totals.count}{" "}
            {t({ en: "carcasses", ar: "ذبيحة" })} — {totals.kg.toFixed(2)} {KG}
          </div>
        )}

        {step !== "emp" && step !== "done" && (
          <div style={S.crumbs}>
            {branchObj && <span className="bt-chip" style={S.crumb}>{nameOf(branchObj, isAr)}</span>}
            {bomCatName && <span className="bt-chip" style={S.crumb}>{bomCatName}</span>}
            {bom && <span className="bt-chip" style={S.crumb}>{bom.ref}</span>}
            {pathway && (
              <span className="bt-chip" style={{ ...S.crumb, color: "#6d28d9" }}>
                🔀 {pathway.code}{pathway.name ? ` · ${pathway.name}` : ""}
              </span>
            )}
            {inputItem && <span className="bt-chip" style={S.crumb}>{itemName(inputItem, isAr)}</span>}
            {step === "cuts" && carcassKg > 0 && (
              <span className="bt-chip" style={S.crumb}>
                {t({ en: "Raw material", ar: "المادة الخام" })}: {carcassKg.toFixed(2)} {KG}
              </span>
            )}
          </div>
        )}

        {/* 1 — الرقم الوظيفي + الملحمة */}
        {step === "emp" && (
          <div style={S.card}>
            <div className="bt-q" style={S.q}>
              {t({ en: "Employee number", ar: "الرقم الوظيفي" })}
            </div>
            <input
              className="bt-num"
              value={empNo}
              onChange={(e) => setEmpNo(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && startWithEmp()}
              inputMode="numeric"
              autoFocus
              placeholder="0000"
              style={S.input}
            />
            {empNo.trim() && person && (
              <div className="bt-rise" style={S.person}>
                <span style={S.personAvatar}>👤</span>
                <span style={S.personBody}>
                  <span className="bt-name" style={S.personName}>{person.name || empNo}</span>
                  {person.job && (
                    <span className="bt-lbl" style={S.personJob}>{person.job}</span>
                  )}
                  {person.branchLabel && (
                    <span className="bt-lbl" style={S.personBranch}>{person.branchLabel}</span>
                  )}
                </span>
              </div>
            )}
            {empNo.trim() && !person && !butcherBlocked && (
              <div className="bt-lbl" style={S.personHint}>
                {t({
                  en: "Number not found in the employee register — you can still continue.",
                  ar: "الرقم غير موجود في سجل الموظفين — بتقدر تكمّل عادي.",
                })}
              </div>
            )}
            {butcherBlocked && (
              <div className="bt-sum" style={S.error}>
                {t({
                  en: "This employee number is not registered. Ask your supervisor to register it before you start.",
                  ar: "هذا الرقم الوظيفي غير مسجّل. راجع المشرف لتسجيله قبل ما تبدأ.",
                })}
              </div>
            )}

            <div className="bt-q" style={S.q}>
              {t({ en: "Butchery / Branch", ar: "الملحمة / الفرع" })}
            </div>
            <select
              className="bt-cutnum"
              value={branch}
              onChange={(e) => { branchTouched.current = true; setBranch(e.target.value); }}
              style={S.select}
            >
              <option value="">{t({ en: "Select…", ar: "اختر…" })}</option>
              {BRANCHES.map((b) => (
                <option key={b.code} value={b.code}>{nameOf(b, isAr)}</option>
              ))}
            </select>
            <button
              className="bt-btn"
              onClick={startWithEmp}
              disabled={!empNo.trim() || butcherBlocked || (RULES.requireBranch !== false && !branch)}
              style={{
                ...S.primary,
                ...(empNo.trim() && !butcherBlocked && (RULES.requireBranch === false || branch)
                  ? null : S.disabled),
              }}
            >
              {t({ en: "Enter", ar: "دخول" })}
            </button>
          </div>
        )}

        {/* 2 — اختيار فئة الوصفات */}
        {step === "category" && (
          <>
            <div className="bt-q" style={S.q}>
              {t({ en: "Choose a category", ar: "اختر الفئة" })}
            </div>
            <div style={S.grid}>
              {catPick.cats.map((c) => (
                <button key={c.id} className="bt-press" onClick={() => pickCategory(c.id)} style={S.tile}>
                  <span className="bt-name" style={S.name}>{nameOf(c, isAr) || c.id}</span>
                  <span className="bt-lbl" style={{ color: "#6b8299", fontWeight: 800 }}>
                    {c.count} {t({ en: "recipes", ar: "وصفة" })}
                  </span>
                </button>
              ))}
              {catPick.uncat > 0 && (
                <button className="bt-press" onClick={() => pickCategory(UNCAT)} style={S.tile}>
                  <span className="bt-name" style={S.name}>{t({ en: "Uncategorized", ar: "بلا فئة" })}</span>
                  <span className="bt-lbl" style={{ color: "#6b8299", fontWeight: 800 }}>
                    {catPick.uncat} {t({ en: "recipes", ar: "وصفة" })}
                  </span>
                </button>
              )}
            </div>
          </>
        )}

        {/* 3 — اختيار وصفة التقطيع (Cutting BOM) */}
        {step === "bom" && (
          <>
            <div className="bt-q" style={S.q}>
              {t({ en: "Choose a cutting recipe", ar: "اختر وصفة التقطيع" })}
            </div>
            {!shownBoms.length && (
              <div className="bt-sum" style={S.emptyBox}>
                {t({
                  en: "No cutting recipes here — add them in Manufacturing → Cutting BOMs.",
                  ar: "لا توجد وصفات تقطيع هنا — ضيفها من التصنيع ← قوائم التقطيع (Cutting BOMs).",
                })}
              </div>
            )}
            {shownBoms.length > 3 && (
              <input
                className="bt-cutnum"
                value={bomSearch}
                onChange={(e) => setBomSearch(e.target.value)}
                placeholder={t({ en: "Search recipe / raw material…", ar: "بحث بالوصفة أو المادة الخام…" })}
                style={S.input}
              />
            )}
            <div style={S.grid}>
              {shownBoms
                .filter((b) => {
                  const q = bomSearch.trim().toLowerCase();
                  if (!q) return true;
                  const inp = bomInputItem(mrpCfg, b);
                  return [b.ref, inp?.sku, inp?.ar, inp?.en]
                    .filter(Boolean).join(" ").toLowerCase().includes(q);
                })
                .map((b) => {
                  const inp = bomInputItem(mrpCfg, b);
                  const multi = bomIsMultiPath(b);
                  const outN = multi
                    ? activePathwaysOf(b).length
                    : (b.outputs || []).length;
                  return (
                    <button key={b.id} className="bt-press" onClick={() => pickBom(b)} style={S.tile}>
                      <span className="bt-name" style={S.name}>{itemName(inp, isAr)}</span>
                      {altNameOf(inp, isAr) && (
                        <span className="bt-lbl" style={S.altName}>{altNameOf(inp, isAr)}</span>
                      )}
                      <span className="bt-lbl" style={S.code}>{b.ref}</span>
                      <span className="bt-lbl" style={{ color: "#6b8299", fontWeight: 800 }}>
                        {multi
                          ? `🔀 ${outN} ${t({ en: "pathways", ar: "مسار" })}`
                          : `${outN} ${t({ en: "final products", ar: "منتج نهائي" })}`}
                      </span>
                    </button>
                  );
                })}
            </div>
          </>
        )}

        {/* 2.5 — اختيار المسار (للوصفات متعددة المسارات فقط) */}
        {step === "pathway" && (
          <>
            <div className="bt-q" style={S.q}>
              {t({ en: "Choose the routing pathway", ar: "اختر مسار التوزيع" })}
            </div>
            {!activePathways.length ? (
              <div className="bt-sum" style={S.emptyBox}>
                {t({
                  en: "This recipe has no active pathway — activate one in Manufacturing → Cutting BOMs.",
                  ar: "هالوصفة ما فيها مسار مفعّل — فعّل واحد من التصنيع ← قوائم التقطيع.",
                })}
              </div>
            ) : (
              <div style={S.grid}>
                {activePathways.map((p) => {
                  const outN = (p.outputs || []).length;
                  return (
                    <button key={p.id} className="bt-press" onClick={() => pickPathway(p)} style={S.tile}>
                      <span className="bt-name" style={S.name}>
                        {p.name || t({ en: "Pathway", ar: "مسار" })}
                      </span>
                      <span className="bt-lbl" style={S.code}>{p.code}</span>
                      <span className="bt-lbl" style={{ color: "#6b8299", fontWeight: 800 }}>
                        {outN} {t({ en: "final products", ar: "منتج نهائي" })}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* 3 — الأوزان: المادة الخام + النواتج بنفس الصفحة */}
        {step === "cuts" && (
          <>
            {/* ── وزن المادة الخام (يغذّي النسب المئوية للنواتج) ── */}
            <div style={S.rawCard}>
              <div style={S.rawHead}>
                <span className="bt-lbl" style={{ color: "#6b8299", fontWeight: 800 }}>
                  {t({ en: "Raw material", ar: "المادة الخام" })}
                </span>
                {inputItem && (
                  <>
                    <span className="bt-name" style={S.name}>{itemName(inputItem, isAr)}</span>
                    {altNameOf(inputItem, isAr) && (
                      <span className="bt-lbl" style={S.altName}>{altNameOf(inputItem, isAr)}</span>
                    )}
                  </>
                )}
              </div>
              <label style={S.rawField}>
                <span className="bt-lbl" style={S.lbl}>
                  {t({ en: "Weight before cutting (kg)", ar: "الوزن قبل التقطيع (كجم)" })}
                </span>
                <input
                  className="bt-num"
                  value={carcass}
                  onChange={(e) => setCarcass(e.target.value)}
                  inputMode="decimal"
                  autoFocus
                  placeholder="0.00"
                  style={S.input}
                />
              </label>
              {needPieces && (
                <label style={S.rawField}>
                  <span className="bt-lbl" style={S.lbl}>
                    {t({ en: "Number of pieces", ar: "عدد القطع" })}
                  </span>
                  <input
                    className="bt-num"
                    value={pieceCount}
                    onChange={(e) => setPieceCount(e.target.value.replace(/[^\d]/g, ""))}
                    inputMode="numeric"
                    placeholder="0"
                    style={{ ...S.input, ...(pieceMissing ? { borderColor: "#e88", background: "#fff7f7" } : null) }}
                  />
                </label>
              )}

              {/* ── التواريخ: تاريخ التقطيع (يختاره الجزار) وتاريخ الإدخال (تلقائي) ── */}
              <div style={S.dateRow}>
                <label style={S.dateField}>
                  <span className="bt-lbl" style={S.lbl}>
                    {t({ en: "Cutting date", ar: "تاريخ التقطيع" })}
                  </span>
                  <input
                    className="bt-cutnum"
                    type="date"
                    value={cutDate}
                    max={todayStr()}
                    disabled={RULES.allowBackdate !== true}
                    onChange={(e) => setCutDate(e.target.value)}
                    style={{
                      ...S.select,
                      ...(RULES.allowBackdate !== true ? { background: "#f1f6fb", color: "#6b8299" } : null),
                    }}
                  />
                </label>
                <label style={S.dateField}>
                  <span className="bt-lbl" style={S.lbl}>
                    {t({ en: "Data entry date", ar: "تاريخ إدخال البيانات" })}
                  </span>
                  <span className="bt-cutnum" style={S.stamp}>{stampStr(entryAt)}</span>
                </label>
              </div>
            </div>

            {/* ── المنتجات النهائية (نواتج الوصفة) ── */}
            <div className="bt-lbl" style={S.sectionLbl}>
              {t({ en: "Final products", ar: "المنتجات النهائية" })}
            </div>
            <div style={S.grid}>
              {productCuts.map((c) => {
                const w = num(values[c.id]?.w);
                const target = targetKgOf(c);
                return (
                  <ItemCard
                    key={c.id}
                    item={c}
                    value={values[c.id]?.w || ""}
                    onChange={(v) => setVal(c.id, "w", v)}
                    code={c.sku}
                    pct={showPct && w > 0 && carcassKg > 0 ? pctOf(w) : null}
                    pctLabel={t({ en: "of raw", ar: "من الخام" })}
                    target={target > 0 ? target : null}
                    targetLabel={t({ en: "target", ar: "الهدف" })}
                    tone={targetTone(target, w)}
                    isAr={isAr}
                    t={t}
                  />
                );
              })}
              {!productCuts.length && (
                <div className="bt-sum" style={S.emptyBox}>
                  {t({
                    en: "This recipe has no final products — fix the BOM.",
                    ar: "هالوصفة بلا منتجات نهائية — صحّح الوصفة.",
                  })}
                </div>
              )}
            </div>

            {/* ── الهدر ── */}
            {wasteCuts.length > 0 && (
              <>
                <div className="bt-lbl" style={S.sectionLbl}>
                  {t({ en: "Waste", ar: "الهدر" })}
                </div>
                <div style={S.wasteRow}>
                  {wasteCuts.map((c) => {
                    const w = num(values[c.id]?.w);
                    return (
                      <ItemCard
                        key={c.id}
                        item={c}
                        value={values[c.id]?.w || ""}
                        onChange={(v) => setVal(c.id, "w", v)}
                        code={c.sku}
                        pct={showPct && w > 0 && carcassKg > 0 ? pctOf(w) : null}
                        pctLabel={t({ en: "of raw", ar: "من الخام" })}
                        tone={S.wasteTone}
                        isAr={isAr}
                        t={t}
                      />
                    );
                  })}
                </div>
              </>
            )}

            <div className="bt-sum" style={{ ...S.sumBar, ...(isOver ? S.sumBarOver : null) }}>
              <ProgressRing used={usedKg} total={carcassKg} over={isOver} t={t} />
              <span>{t({ en: "Products", ar: "النواتج" })}: <b>{cutsKg.toFixed(2)}</b></span>
              <span>{t({ en: "Waste", ar: "الهدر" })}: <b>{wasteKg.toFixed(2)}</b></span>
              <span>{t({ en: "Raw material", ar: "المادة الخام" })}: <b>{carcassKg.toFixed(2)}</b></span>
              <span style={isOver ? S.overText : null}>
                {t({ en: "Remaining", ar: "المتبقي" })}: <b>{remainingKg.toFixed(2)}</b> {KG}
              </span>
            </div>

            {/* النِّسب من وزن المادة الخام */}
            <div className="bt-sum" style={S.pctBar}>
              <span>
                {t({ en: "Net yield", ar: "نسبة التصافي" })}: <b>{netYieldPct.toFixed(1)}%</b>
              </span>
              <span>
                {t({ en: "Waste %", ar: "نسبة الهدر" })}: <b>{wastePct.toFixed(1)}%</b>
              </span>
            </div>

            {exactBalance && (
              <div className="bt-sum" style={{ ...S.pctBar, ...(balanceOff ? S.sumBarOver : null) }}>
                <span>🎯 {t({ en: "Exact balance required", ar: "مطلوب تطابق تام" })}</span>
                <span style={balanceOff ? S.overText : { color: "#166534", fontWeight: 900 }}>
                  {carcassKg <= 0
                    ? t({ en: "enter the raw material weight", ar: "أدخل وزن المادة الخام" })
                    : Math.abs(balanceDiff) <= 1e-6
                      ? `✓ ${t({ en: "matched", ar: "مطابق تماماً" })}`
                      : balanceDiff > 0
                        ? `${t({ en: "short by", ar: "ناقص" })} ${balanceDiff.toFixed(2)} ${KG}`
                        : `${t({ en: "over by", ar: "زايد" })} ${Math.abs(balanceDiff).toFixed(2)} ${KG}`}
                </span>
              </div>
            )}

            {pieceMissing && (
              <div className="bt-sum" style={S.warn}>
                {t({
                  en: "Number of pieces is required for this recipe.",
                  ar: "إدخال عدد القطع إلزامي لهالوصفة.",
                })}
              </div>
            )}
            {wasteMissing && (
              <div className="bt-sum" style={S.warn}>
                {t({
                  en: "Waste weight is required.",
                  ar: "إدخال وزن الهدر إلزامي.",
                })}
              </div>
            )}
            {isOver && (
              <div className="bt-sum" style={overBlocks ? S.error : S.warn}>
                {overBlocks
                  ? (isAr
                      ? `المجموع أكبر من وزن المادة الخام بـ ${overKg.toFixed(2)} كجم — صحّح الأوزان قبل الحفظ.`
                      : `Total exceeds the raw material weight by ${overKg.toFixed(2)} kg — fix the weights before saving.`)
                  : (isAr
                      ? `تنبيه: المجموع أكبر من وزن المادة الخام بـ ${overKg.toFixed(2)} كجم — مسموح الحفظ لأن التطابق التام غير مفعّل.`
                      : `Note: total exceeds the raw material weight by ${overKg.toFixed(2)} kg — saving is allowed because exact balance is off.`)}
              </div>
            )}
            {error && <div className="bt-sum" style={S.error}>{error}</div>}

            <button
              className="bt-btn"
              onClick={save}
              disabled={!canSave || saving}
              style={{ ...S.primary, marginTop: 14, ...(canSave && !saving ? null : S.disabled) }}
            >
              {saving
                ? t({ en: "Saving…", ar: "جارٍ الحفظ…" })
                : `${t({ en: "Save", ar: "حفظ" })} (${cutCount})`}
            </button>
          </>
        )}

        {/* 6 — تم */}
        {step === "done" && saved && (
          <div style={S.card}>
            <div className="bt-done bt-pop" style={{ textAlign: "center" }}>
              {saved.queued ? "📥" : "✅"}
            </div>
            <div className="bt-q" style={S.q}>{saved.animal} — {saved.origin}</div>
            {/* حُفظ محلياً — لا يضيع، بينرفع لحاله لما يرجع النت */}
            {saved.queued && (
              <div className="bt-sum" style={S.queuedNote}>
                {t({
                  en: "Saved on this device — no internet right now. It will upload automatically once the connection is back.",
                  ar: "انحفظ على الجهاز — ما في إنترنت هلأ. رح يترفع لحاله أول ما يرجع الاتصال.",
                })}
              </div>
            )}
            <div>
              <div className="bt-sum" style={S.doneRow}>
                <span>{t({ en: "Cutting date", ar: "تاريخ التقطيع" })}</span>
                <b>{saved.cutDate}</b>
              </div>
              <div className="bt-sum" style={S.doneRow}>
                <span>{t({ en: "Data entry date", ar: "تاريخ إدخال البيانات" })}</span>
                <b>{saved.entryStamp}</b>
              </div>
              <div className="bt-sum" style={S.doneRow}>
                <span>{t({ en: "Raw material weight", ar: "وزن المادة الخام" })}</span>
                <b>{saved.carcassKg.toFixed(2)} {KG}</b>
              </div>
              {Number.isFinite(saved.pieceCount) && (
                <div className="bt-sum" style={S.doneRow}>
                  <span>{t({ en: "Number of pieces", ar: "عدد القطع" })}</span>
                  <b>{saved.pieceCount}</b>
                </div>
              )}
              <div className="bt-sum" style={S.doneRow}>
                <span>{t({ en: "Total products", ar: "مجموع النواتج" })} ({saved.count})</span>
                <b>{saved.cutsKg.toFixed(2)} {KG}</b>
              </div>
              <div className="bt-sum" style={S.doneRow}>
                <span>{t({ en: "Waste", ar: "الهدر" })}</span>
                <b>{saved.wasteKg.toFixed(2)} {KG}</b>
              </div>
              <div className="bt-sum" style={S.doneRow}>
                <span>{t({ en: "Net yield", ar: "نسبة التصافي" })}</span>
                <b style={{ color: "#1f6fd0" }}>{saved.netYieldPct.toFixed(1)}%</b>
              </div>
              <div className="bt-sum" style={S.doneRow}>
                <span>{t({ en: "Waste & bone %", ar: "نسبة الهدر والعضم" })}</span>
                <b style={{ color: "#a16207" }}>{saved.wastePct.toFixed(1)}%</b>
              </div>
            </div>
            {totals && (
              <div className="bt-chip" style={S.totals}>
                {t({ en: "Today", ar: "اليوم" })}: {totals.count}{" "}
                {t({ en: "carcasses", ar: "ذبيحة" })} — {totals.kg.toFixed(2)} {KG}
              </div>
            )}
            <button className="bt-btn" onClick={newEntry} style={S.primary}>
              {t({ en: "New entry", ar: "تسجيل جديد" })}
            </button>
          </div>
        )}

        {["category", "bom", "cuts"].includes(step) && (
          <button className="bt-back" onClick={back} style={S.back}>
            {t({ en: "Back", ar: "رجوع" })}
          </button>
        )}
      </div>
    </div>
  );
}

/* ============================ خطة اليوم ============================ */
/* هدف الملحمة اليوم مقابل المنجز — عدّاد التنفيذات ووزن المادة الخام.
   يظهر فقط لما يكون المشرف حدّد هدفاً، وإلا لا نزحم شاشة الجزار. */
function DayPlanBar({ plan, progress, branchName, KG, t }) {
  const bars = [
    {
      key: "count",
      label: t({ en: "Carcasses", ar: "الذبائح" }),
      done: progress.branch.count,
      target: Number(plan.targetCount) || 0,
      fmt: (v) => String(Math.round(v)),
    },
    {
      key: "kg",
      label: t({ en: "Raw weight", ar: "وزن الخام" }),
      done: progress.branch.rawKg,
      target: Number(plan.targetKg) || 0,
      fmt: (v) => `${v.toFixed(0)} ${KG}`,
    },
  ].filter((b) => b.target > 0);

  if (!bars.length) return null;
  const allDone = bars.every((b) => b.done >= b.target);

  return (
    <div className="bt-rise" style={{ ...S.planBox, ...(allDone ? S.planBoxDone : null) }}>
      <div style={S.planHead}>
        <span className="bt-sum" style={{ fontWeight: 900 }}>
          🎯 {t({ en: "Today's plan", ar: "خطة اليوم" })}
          {branchName ? ` — ${branchName}` : ""}
        </span>
        {allDone && (
          <span className="bt-chip" style={S.planDoneChip}>
            ✓ {t({ en: "Target reached", ar: "تحقّق الهدف" })}
          </span>
        )}
      </div>

      {bars.map((b) => {
        const p = progressPct(b.done, b.target);
        const done = b.done >= b.target;
        return (
          <div key={b.key} style={S.planRow}>
            <span className="bt-lbl" style={S.planLbl}>{b.label}</span>
            <span style={S.planTrack}>
              <span style={{
                ...S.planFill,
                width: `${p}%`,
                background: done ? "#047857" : "#1f6fd0",
              }} />
            </span>
            <span className="bt-sum" style={{ ...S.planNums, color: done ? "#047857" : "#14507f" }}>
              {b.fmt(b.done)} / {b.fmt(b.target)}
            </span>
          </div>
        );
      })}

      {progress.mine.count > 0 && (
        <div className="bt-lbl" style={S.planMine}>
          {t({ en: "Your share today", ar: "نصيبك اليوم" })}: {progress.mine.count}{" "}
          {t({ en: "carcasses", ar: "ذبيحة" })} · {progress.mine.rawKg.toFixed(0)} {KG}
        </div>
      )}
      {plan.note && (
        <div className="bt-lbl" style={S.planNote}>📌 {plan.note}</div>
      )}
    </div>
  );
}

/* ============================ رسمة / صورة عنصر ============================ */
/* صورة مرفوعة تسبق الرسمة المدمجة. أصناف الوصفات (MRP) بلا رسمة ولا صورة،
   و artOf ترجع الـid كاحتياط — لذلك نشترط رسمة **معروفة** فعلاً، وإلا لا نرسم
   المربّع أصلاً حتى لا يبقى صندوق رمادي فارغ فوق كل منتج. */
function hasArt(item) {
  return !!imageOf(item) || ART_IDS.includes(artOf(item));
}

function ItemArt({ item }) {
  const url = imageOf(item);
  if (url) return <img src={url} alt="" style={S.artImg} />;
  const art = artOf(item);
  return ART_IDS.includes(art) ? <ButcherArt id={art} /> : null;
}

/* ============================ كرت عنصر بخانة وزن واحدة ============================ */
/* خانة وزن واحدة فقط لكل عنصر — لا خانة هدر داخل المنتج.
   pct = النسبة الفعلية للرقم المُدخل من وزن المنتج الأصلي (الأم). */
function ItemCard({
  item, value, onChange, code, pct, pctLabel, tone, target, targetLabel, isAr, t,
}) {
  const active = num(value) > 0;
  return (
    <div
      className="bt-press"
      style={{ ...S.cutCard, ...(active ? S.cutCardOn : null), ...(tone || null) }}
    >
      {hasArt(item) && <span style={S.art}><ItemArt item={item} /></span>}
      <span className="bt-name" style={S.name}>{nameOf(item, isAr)}</span>
      {/* الاسم بالّلغة الأخرى — الجزار يتعرّف على الصنف بأي لغة كُتب فيها */}
      {altNameOf(item, isAr) && (
        <span className="bt-lbl" style={S.altName}>{altNameOf(item, isAr)}</span>
      )}
      {code ? <span className="bt-lbl" style={S.code}>{code}</span> : null}
      <label style={S.field}>
        <span className="bt-lbl" style={S.lbl}>{t({ en: "Weight", ar: "الوزن" })}</span>
        <input
          className="bt-cutnum"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          inputMode="decimal"
          placeholder="0.00"
          style={S.cutInput}
        />
      </label>
      {Number.isFinite(target) && target > 0 && (
        <span className="bt-lbl" style={S.target}>
          🎯 {targetLabel}: {target.toFixed(2)}
        </span>
      )}
      {Number.isFinite(pct) && pct > 0 && (
        <span className="bt-lbl" style={S.pct}>
          {pct.toFixed(1)}% {pctLabel}
        </span>
      )}
    </div>
  );
}

/* ============================ شريط الخطوات ============================ */

function StepBar({ step, hasCat, hasPath, t }) {
  const steps = [
    ...(hasCat ? [{ id: "category", ar: "الفئة", en: "Category" }] : []),
    { id: "bom", ar: "الوصفة", en: "Recipe" },
    ...(hasPath ? [{ id: "pathway", ar: "المسار", en: "Pathway" }] : []),
    { id: "cuts", ar: "الأوزان", en: "Weights" },
  ];
  const at = steps.findIndex((x) => x.id === step);

  return (
    <div style={S.steps}>
      {steps.map((x, i) => {
        const done = at > i;
        const now = at === i;
        return (
          <React.Fragment key={x.id}>
            <div style={S.stepItem}>
              <span style={{
                ...S.stepDot,
                ...(done ? S.stepDotDone : null),
                ...(now ? S.stepDotNow : null),
              }}>
                {done ? "✓" : i + 1}
              </span>
              <span className="bt-lbl bt-step-lbl" style={{
                ...S.stepLbl,
                ...(now ? { color: "#1f6fd0", fontWeight: 900 } : null),
              }}>
                {t(x)}
              </span>
            </div>
            {i < steps.length - 1 && (
              <span style={{ ...S.stepLine, ...(done ? S.stepLineDone : null) }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

/* ============================ حلقة التقدّم ============================ */

function ProgressRing({ used, total, over, t }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  const ratio = total > 0 ? Math.min(used / total, 1) : 0;
  const color = over ? "#dc2626" : ratio > 0.9 ? "#d97706" : "#1f6fd0";

  return (
    <span style={S.ringWrap}>
      <svg width="92" height="92" viewBox="0 0 92 92">
        <circle cx="46" cy="46" r={r} fill="none" stroke="#e6eef7" strokeWidth="11" />
        <circle
          cx="46" cy="46" r={r} fill="none" stroke={color} strokeWidth="11"
          strokeLinecap="round" strokeDasharray={`${c * ratio} ${c}`}
          transform="rotate(-90 46 46)"
          style={{ transition: "stroke-dasharray .3s ease, stroke .2s ease" }}
        />
        <text x="46" y="52" textAnchor="middle" fontSize="20" fontWeight="900" fill={color}>
          {Math.round(ratio * 100)}%
        </text>
      </svg>
      <span className="bt-lbl" style={{ color: "#6b8299", fontWeight: 800 }}>
        {t({ en: "of raw", ar: "من الخام" })}
      </span>
    </span>
  );
}

/** لون خلفية كرت المنتج حسب قربه من الوزن المستهدف من الوصفة (±10%). */
function targetTone(targetKg, actualKg) {
  if (!(targetKg > 0) || !(actualKg > 0)) return null;
  const diff = (actualKg - targetKg) / targetKg;
  if (diff < -0.1) return { background: "#fffbeb", borderColor: "#fcd34d" };   // أقل من الهدف
  if (diff > 0.1) return { background: "#fef2f2", borderColor: "#fca5a5" };    // أكثر من الهدف
  return { background: "#f0fdf4", borderColor: "#86efac" };                     // ضمن المدى
}

/* ============================ الأنماط ============================ */
/* الأحجام النصّية في CSS أعلاه — هنا التخطيط والألوان فقط. */

const FONT = "Cairo, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif";

const S = {
  page: {
    minHeight: "100vh", background: "#eef4fb", fontFamily: FONT, color: "#0f2740",
    padding: "18px 14px 40px", overflowX: "hidden",
  },
  wrap: { maxWidth: "min(1100px, 100%)", margin: "0 auto" },
  wrapWide: { maxWidth: "100%" },   // شبكة القطع تملأ الصفحة
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 14 },
  headerRight: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" },
  title: { fontWeight: 900 },
  langBtn: { background: "#fff", border: "1px solid #cfe0f0", color: "#1f6fd0", fontSize: 18 },
  emp: { display: "flex", alignItems: "center", gap: 8, fontWeight: 800 },
  chg: {
    border: "1px solid #cfe0f0", background: "#fff", color: "#1f6fd0",
    borderRadius: 10, padding: "7px 14px", fontFamily: FONT, fontWeight: 700, cursor: "pointer",
  },
  /* ── مؤشّر الاتصال وصندوق الصادر ── */
  syncChip: {
    borderRadius: 999, padding: "7px 16px", fontFamily: FONT, fontWeight: 800,
    cursor: "pointer", whiteSpace: "nowrap",
  },
  syncOffline: { border: "1px solid #f0c9c9", background: "#fff5f5", color: "#a12626" },
  syncPending: { border: "1px solid #fcd9a4", background: "#fff7ed", color: "#b45309" },
  queuedNote: {
    background: "#fff7ed", border: "1px solid #fcd9a4", color: "#8a5a12",
    borderRadius: 14, padding: "12px 14px", fontWeight: 800, lineHeight: 1.6,
    textAlign: "center",
  },
  /* ── خطة اليوم ── */
  planBox: {
    background: "#fff", border: "2px solid #cfe0f0", borderRadius: 18,
    padding: "14px 16px", marginBottom: 12, display: "flex",
    flexDirection: "column", gap: 10,
  },
  planBoxDone: { borderColor: "#86efac", background: "#f6fffa" },
  planHead: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    gap: 10, flexWrap: "wrap",
  },
  planDoneChip: {
    background: "#dcfce7", color: "#166534", borderRadius: 999,
    padding: "4px 14px", fontWeight: 900,
  },
  planRow: { display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" },
  planLbl: { color: "#6b8299", fontWeight: 800, minWidth: 92 },
  planTrack: {
    flex: 1, minWidth: 140, height: 14, borderRadius: 999,
    background: "#e6eef7", overflow: "hidden", display: "block",
  },
  planFill: { display: "block", height: "100%", borderRadius: 999, transition: "width .4s ease" },
  planNums: { fontWeight: 900, whiteSpace: "nowrap", minWidth: 110, textAlign: "end" },
  planMine: { color: "#6b8299", fontWeight: 800 },
  planWarn: {
    background: "#fff7ed", border: "1px solid #fcd9a4", color: "#8a5a12",
    borderRadius: 14, padding: "12px 14px", fontWeight: 800, lineHeight: 1.7,
    marginBottom: 12, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap",
  },
  planNote: {
    color: "#8a5a12", fontWeight: 800, background: "#fff7ed",
    border: "1px solid #fcd9a4", borderRadius: 12, padding: "8px 12px",
  },
  totals: {
    background: "#fff", border: "1px solid #dbe6f2", borderRadius: 12,
    padding: "10px 12px", fontWeight: 800, color: "#3c5a75", textAlign: "center", marginBottom: 12,
  },
  crumbs: { display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 },
  crumb: { background: "#dceaf8", color: "#14507f", borderRadius: 999, padding: "8px 18px", fontWeight: 800 },
  q: { fontWeight: 900, margin: "8px 0 10px", textAlign: "center" },

  // كروت كبيرة — الرسمة تملأ عرض الكرت
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(240px,100%),1fr))", gap: 18 },
  art: {
    width: "100%", maxWidth: "min(260px, 62vw)", aspectRatio: "1 / 1", margin: "0 auto",
    display: "block", borderRadius: 20, background: "#f5f9fd", padding: 6, boxSizing: "border-box",
  },
  tile: {
    background: "#fff", border: "3px solid #dbe6f2", borderRadius: 26,
    padding: "16px 14px 22px", display: "flex", flexDirection: "column",
    alignItems: "center", gap: 12, cursor: "pointer", fontFamily: FONT, color: "#0f2740",
  },
  tileOrigin: {
    background: "#fff", border: "3px solid #dbe6f2", borderRadius: 26,
    padding: "56px 14px", display: "flex", justifyContent: "center",
    cursor: "pointer", fontFamily: FONT, color: "#0f2740",
  },
  cutCard: {
    position: "relative",
    background: "#fff", border: "3px solid #dbe6f2", borderRadius: 26,
    padding: "14px 16px 18px", display: "flex", flexDirection: "column",
    alignItems: "center", gap: 8, fontFamily: FONT, color: "#0f2740",
  },
  cutCardOn: { border: "3px solid #1f6fd0", background: "#f7fbff" },
  target: { fontWeight: 800, color: "#0f766e" },
  rawCard: {
    background: "#fff", border: "2px solid #cfe0f0", borderRadius: 18,
    padding: "14px 16px", marginBottom: 16, display: "flex",
    flexDirection: "column", gap: 10,
  },
  rawHead: {
    display: "flex", flexDirection: "column", gap: 2, alignItems: "center", textAlign: "center",
  },
  rawField: {
    display: "flex", flexDirection: "column", gap: 6, alignItems: "center",
    maxWidth: 360, width: "100%", margin: "0 auto",
  },
  dateRow: {
    display: "flex", gap: 14, flexWrap: "wrap", justifyContent: "center",
    borderTop: "1px solid #e6eef7", paddingTop: 12, marginTop: 2,
  },
  dateField: { display: "flex", flexDirection: "column", gap: 6, alignItems: "center" },
  stamp: {
    background: "#f1f6fb", border: "1px solid #dbe6f2", borderRadius: 12,
    padding: "12px 16px", fontWeight: 800, color: "#3c5a75", whiteSpace: "nowrap",
  },
  /* صورة مرفوعة بدل الرسمة المدمجة */
  artImg: {
    width: "100%", height: "100%", objectFit: "cover",
    borderRadius: 16, display: "block",
  },
  /* الهدر والعظم — صفّ منفصل بلون مختلف عن شبكة المنتجات */
  wasteRow: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit,minmax(min(240px,100%),1fr))",
    gap: 18,
    marginBottom: 4,
  },
  wasteTone: { background: "#fffdf5", borderColor: "#e8d9a8" },
  emptyBox: {
    gridColumn: "1 / -1", background: "#fff", border: "2px dashed #cfe0f0",
    borderRadius: 20, padding: "26px 18px", textAlign: "center",
    fontWeight: 800, color: "#6b8299",
  },
  name: { fontWeight: 900 },
  // الاسم بالّلغة الأخرى — أصغر وأهدأ، تحت الاسم الأساسي مباشرة
  altName: { color: "#6b8299", fontWeight: 700, textAlign: "center", lineHeight: 1.4 },
  field: { width: "100%", display: "flex", flexDirection: "column", gap: 4, marginTop: 4 },
  lbl: { fontWeight: 800, color: "#6b8299" },
  cutInput: {
    width: "100%", boxSizing: "border-box", border: "2px solid #cfe0f0", borderRadius: 12,
    padding: "12px 10px", fontWeight: 800, textAlign: "center", fontFamily: FONT,
    color: "#0f2740", outline: "none",
  },

  sumBar: {
    marginTop: 16, background: "#fff", border: "1px solid #dbe6f2", borderRadius: 14,
    padding: "14px", display: "flex", flexWrap: "wrap", gap: 16,
    justifyContent: "space-around", fontWeight: 700, color: "#3c5a75",
  },
  sumBarOver: { border: "2px solid #e88", background: "#fff7f7" },
  overText: { color: "#a12626", fontWeight: 900 },
  pctBar: {
    marginTop: 10, background: "#f7fbff", border: "1px solid #dbe6f2", borderRadius: 14,
    padding: "12px 14px", display: "flex", flexWrap: "wrap", gap: 16,
    justifyContent: "space-around", fontWeight: 800, color: "#14507f",
  },
  pct: { fontWeight: 800, color: "#1f6fd0" },
  code: {
    fontWeight: 800, color: "#6b8299", background: "#eef4fb",
    border: "1px solid #dbe6f2", borderRadius: 999, padding: "2px 12px",
  },

  /* ── الذبيحة الكاملة: كرت عريض منفصل ── */
  sectionLbl: { fontWeight: 900, color: "#6b8299", margin: "4px 0 10px" },
  hero: {
    width: "100%", background: "linear-gradient(135deg,#fff,#f3f8ff)",
    border: "3px solid #1f6fd0", borderRadius: 28, padding: "18px 20px",
    display: "flex", alignItems: "center", gap: 22, textAlign: "start", flexWrap: "wrap",
    cursor: "pointer", fontFamily: FONT, color: "#0f2740",
    boxShadow: "0 10px 26px rgba(31,111,208,.14)",
  },
  heroArt: {
    width: "min(190px, 42vw)", minWidth: 120, aspectRatio: "1 / 1",
    background: "#f5f9fd", borderRadius: 22, padding: 8, boxSizing: "border-box",
  },
  heroBody: { display: "flex", flexDirection: "column", gap: 8, flex: 1 },
  heroTitle: { fontWeight: 900 },
  heroSub: { fontWeight: 700, color: "#6b8299" },
  heroChips: { display: "flex", gap: 8, flexWrap: "wrap" },
  heroGo: { fontWeight: 900, color: "#1f6fd0" },

  divider: {
    display: "flex", alignItems: "center", justifyContent: "center",
    margin: "22px 0 16px", borderTop: "2px dashed #cfe0f0", position: "relative",
  },
  dividerText: {
    background: "#eef4fb", color: "#6b8299", fontWeight: 900,
    padding: "0 16px", transform: "translateY(-50%)",
  },

  /* ── لوحة النِّسب المرجعية ── */
  ref: {
    background: "#fff", border: "1px solid #dbe6f2", borderRadius: 20, padding: 16,
  },
  refTitle: { fontWeight: 900, color: "#14507f", marginBottom: 6 },
  refNote: { fontWeight: 700, color: "#8aa3b8", marginBottom: 10, lineHeight: 1.5 },
  refRow: {
    display: "flex", alignItems: "center", gap: 8, justifyContent: "space-between",
    padding: "9px 0", borderTop: "1px solid #f0f5fa", fontWeight: 800,
  },
  refName: { flex: 1 },
  refTarget: { color: "#6b8299" },
  refVal: { borderRadius: 999, padding: "2px 10px", fontWeight: 900 },

  card: {
    background: "#fff", border: "1px solid #dbe6f2", borderRadius: 22,
    padding: 24, display: "flex", flexDirection: "column", gap: 14,
  },
  input: {
    width: "100%", boxSizing: "border-box", border: "2px solid #cfe0f0", borderRadius: 16,
    padding: "18px 14px", fontWeight: 900, textAlign: "center", fontFamily: FONT,
    color: "#0f2740", outline: "none",
  },
  select: {
    width: "100%", boxSizing: "border-box", border: "2px solid #cfe0f0", borderRadius: 16,
    padding: "16px 14px", fontWeight: 800, textAlign: "center", fontFamily: FONT,
    color: "#0f2740", outline: "none", background: "#fff",
  },
  primary: {
    border: "none", background: "#1f6fd0", color: "#fff", borderRadius: 16,
    padding: "18px 14px", fontWeight: 900, fontFamily: FONT, cursor: "pointer", width: "100%",
  },
  primaryWarn: { background: "#d97706" },
  disabled: { background: "#a9c3dd", cursor: "not-allowed" },
  back: {
    marginTop: 16, width: "100%", border: "1px solid #cfe0f0", background: "#fff",
    color: "#3c5a75", borderRadius: 14, padding: "14px", fontWeight: 800,
    fontFamily: FONT, cursor: "pointer",
  },
  warn: {
    background: "#fff7ed", border: "2px solid #fdba74", color: "#9a3412",
    borderRadius: 12, padding: "12px 14px", fontWeight: 800, textAlign: "center",
  },
  error: {
    marginTop: 12, background: "#fdecec", border: "2px solid #f5c2c2", color: "#a12626",
    borderRadius: 12, padding: "12px 14px", fontWeight: 800, textAlign: "center",
  },
  person: {
    display: "flex", alignItems: "center", gap: 14,
    background: "linear-gradient(135deg,#f0f7ff,#eafaf1)",
    border: "2px solid #bfe3cf", borderRadius: 18, padding: "14px 16px",
  },
  personAvatar: {
    width: 58, height: 58, borderRadius: "50%", background: "#fff",
    border: "2px solid #dbe6f2", display: "grid", placeItems: "center",
    fontSize: 30, flex: "0 0 auto", lineHeight: 1,
  },
  personBody: { display: "flex", flexDirection: "column", gap: 2, minWidth: 0 },
  personName: { fontWeight: 900, color: "#14532d" },
  personJob: { fontWeight: 800, color: "#1f6fd0" },
  personBranch: { fontWeight: 700, color: "#6b8299" },
  personHint: { color: "#8aa3b8", fontWeight: 700, textAlign: "center" },

  steps: {
    display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap",
    background: "#fff", border: "1px solid #dbe6f2", borderRadius: 16,
    padding: "12px 14px", marginBottom: 12,
  },
  stepItem: { display: "flex", alignItems: "center", gap: 8 },
  stepDot: {
    width: 34, height: 34, borderRadius: "50%", display: "grid", placeItems: "center",
    background: "#eef4fb", color: "#8aa3b8", fontWeight: 900, flex: "0 0 auto",
  },
  stepDotDone: { background: "#dcfce7", color: "#166534" },
  stepDotNow: { background: "#1f6fd0", color: "#fff" },
  stepLbl: { color: "#8aa3b8", fontWeight: 800 },
  stepLine: { flex: 1, minWidth: 14, height: 3, background: "#e6eef7", borderRadius: 2 },
  stepLineDone: { background: "#86efac" },

  ringWrap: { display: "flex", flexDirection: "column", alignItems: "center", gap: 2 },

  doneRow: {
    display: "flex", justifyContent: "space-between", fontWeight: 700,
    padding: "10px 0", borderTop: "1px solid #f0f5fa",
  },
};
