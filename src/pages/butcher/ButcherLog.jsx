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
//   • السيرفر هو مصدر الحقيقة — كل ذبيحة سجل واحد فيه مصفوفة cuts عبر
//     POST /api/reports بنوع butcher_cut_log. الـ localStorage للكاش فقط.
//   • UNIQUE على (type, payload->>'reportDate') لكل الأنواع ما عدا maintenance،
//     لذلك reportDate = طابع وقت ISO فريد لكل تسجيل، مع حقل date لليوم،
//     وإعادة محاولة عند 409.
//   • أحجام الخطوط عبر <style> بكلاسات لا inline: globals.css فيه
//     `#root * { font-size:14px !important }` ويدهس أي fontSize inline.

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import API_BASE from "../../config/api";
import ButcherArt from "./ButcherIcons";
import { BRANCHES, TYPE, isSpecialCut, nameOf } from "./butcherOptions";
import {
  butcherByNo, cfgCode, cfgRef, enabledOnly, gradesFor, originsForAnimal,
  roundKg, sortByOrder, useButcherConfig,
} from "./butcherConfig";
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
  #root .bt-pad-key { font-size: 26px !important; }
  #root .bt-pad-lbl { font-size: 16px !important; }
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
/* لوحة الأرقام المرسّاة أسفل الشاشة */
#root .bt-pad { position: fixed; inset-inline: 0; bottom: 0; z-index: 60; }
#root .bt-pad-key { font-size: 34px !important; }
#root .bt-pad-lbl { font-size: 20px !important; }
`;

/** استخراج كود الملحمة من نص فرع الموظف في سجل الموظفين. */
function branchCodeFromLabel(label) {
  if (!label) return "";
  const norm = String(label).toUpperCase().replace(/\s+/g, "");
  const hit = BRANCHES.find(
    (b) => norm.includes(String(b.code).toUpperCase().replace(/\s+/g, ""))
  );
  return hit ? hit.code : "";
}

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

/** رقم من إدخال المستخدم — يقبل الفاصلة العربية/اللاتينية. */
function num(v) {
  const n = Number(String(v ?? "").replace(",", ".").trim());
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function toArray(data) {
  return (
    (Array.isArray(data) && data) ||
    (Array.isArray(data?.data) && data.data) ||
    (Array.isArray(data?.items) && data.items) ||
    (Array.isArray(data?.reports) && data.reports) ||
    []
  );
}

/** مجموع أوزان القطع داخل سجل — بدون كروت المجاميع، ويدعم السجلات القديمة. */
function recordCutsKg(p) {
  if (Array.isArray(p?.cuts)) {
    return p.cuts.reduce(
      (s, c) => s + (isSpecialCut(c?.cutId) ? 0 : Number(c?.weightKg) || 0),
      0
    );
  }
  return Number(p?.weightKg) || 0;
}

/** حفظ ذبيحة. reportDate = طابع وقت فريد حتى لا يصطدم بالـ UNIQUE. */
async function saveCarcass(payload, attempt = 0) {
  const stamp = new Date(Date.now() + attempt).toISOString();
  const res = await fetch(`${API_BASE}/api/reports`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      reporter: payload.employeeNo || "butcher",
      type: TYPE,
      payload: { ...payload, reportDate: stamp },
    }),
  });
  if (res.status === 409 && attempt < 5) return saveCarcass(payload, attempt + 1);
  if (!res.ok) throw new Error(`Server ${res.status}: ${await res.text()}`);
  return res.json();
}

/** ملخّص اليوم لهذا الموظف (اختياري — يُخفى بصمت لو فشل الطلب). */
async function fetchTodayTotals(employeeNo) {
  const res = await fetch(
    `${API_BASE}/api/reports?type=${encodeURIComponent(TYPE)}&limit=5000`,
    { headers: { Accept: "application/json" }, cache: "no-store" }
  );
  if (!res.ok) throw new Error(`Server ${res.status}`);
  const rows = toArray(await res.json());
  const day = todayStr();
  const mine = rows.filter((r) => {
    const p = r?.payload || {};
    return String(p.employeeNo || "") === String(employeeNo) &&
      String(p.date || p.reportDate || "").slice(0, 10) === day;
  });
  return {
    count: mine.length,
    kg: mine.reduce((s, r) => s + recordCutsKg(r?.payload), 0),
  };
}

/* ============================ الصفحة ============================ */

export default function ButcherLog() {
  const navigate = useNavigate();
  const { t, isAr, dir, lang, toggle } = useSettingsLang();
  const { cfg } = useButcherConfig();
  const isLoggedIn = hasSession();

  /* القوائم والشروط تأتي من إعدادات الجزار (لوحة الإعدادات) */
  const ANIMALS = useMemo(() => enabledOnly(cfg.animals), [cfg]);
  const CUTS = useMemo(() => sortByOrder(enabledOnly(cfg.cuts)), [cfg]);
  const SHEEP_PIECES = useMemo(() => sortByOrder(enabledOnly(cfg.pieces)), [cfg]);

  const RULES = cfg.rules;

  // emp | animal | origin | grade | piece | carcass | cuts | done
  const [step, setStep] = useState("emp");
  const [empNo, setEmpNo] = useState("");
  const [branch, setBranch] = useState("");
  const [animal, setAnimal] = useState(null);
  const [origin, setOrigin] = useState(null);
  const [grade, setGrade] = useState(null);   // درجة اللحم (lamb/hogget/mutton) إن وُجدت
  const [carcass, setCarcass] = useState("");   // الوزن قبل التقطيع
  const [values, setValues] = useState({});     // { cutId: { w, waste } }
  const [pieces, setPieces] = useState({});     // { pieceId: { w, waste } }
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [totals, setTotals] = useState(null);
  const [saved, setSaved] = useState(null);     // ملخّص آخر حفظ
  const [entryDate, setEntryDate] = useState(todayStr()); // يُستعمل فقط لو سُمح بتاريخ سابق
  // الحقل النشط للوحة الأرقام: { kind: "emp"|"carcass"|"cut"|"piece", id, key }
  const [focusField, setFocusField] = useState(null);

  useEffect(() => {
    try {
      const lastEmp = localStorage.getItem(LAST_EMP_KEY);
      const lastBranch = localStorage.getItem(LAST_BRANCH_KEY);
      if (lastEmp) setEmpNo(lastEmp);
      if (lastBranch) setBranch(lastBranch);
    } catch { /* ignore */ }
  }, []);

  const refreshTotals = useCallback((emp) => {
    if (!emp) return;
    fetchTodayTotals(emp).then(setTotals).catch(() => setTotals(null));
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

  // المناشئ تتبع النوع المختار (الجمل محلي، العجل هندي/أسترالي…)
  const originList = useMemo(
    () => (animal ? originsForAnimal(cfg, animal.id) : []),
    [cfg, animal]
  );
  const branchObj = useMemo(
    () => BRANCHES.find((b) => b.code === branch) || null,
    [branch]
  );
  /* الدرجات المتاحة لهذا (النوع × المنشأ) — الأسترالي: لامب/هوغيت/موتون */
  const gradeList = useMemo(
    () => (animal && origin ? gradesFor(cfg, animal.id, origin.id) : []),
    [cfg, animal, origin]
  );

  /* مجاميع الشاشة الحالية */
  const carcassKg = num(carcass);
  const filled = useMemo(
    () =>
      CUTS.map((c) => ({
        cut: c,
        weightKg: num(values[c.id]?.w),
        wasteBoneKg: c.weightOnly ? 0 : num(values[c.id]?.waste),
      })).filter((x) => x.weightKg > 0 || x.wasteBoneKg > 0),
    [values, CUTS]
  );
  const cutsKg = filled.reduce((s, x) => s + (x.cut.weightOnly ? 0 : x.weightKg), 0);
  // الهدر والعضم = هدر كل قطعة + كرتَي "الهدر الكامل" و"العضم الكامل"
  const wasteKg = filled.reduce(
    (s, x) => s + x.wasteBoneKg + (x.cut.weightOnly ? x.weightKg : 0), 0
  );
  const cutCount = filled.filter((x) => !x.cut.weightOnly).length;

  const usedKg = cutsKg + wasteKg;
  const remainingKg = carcassKg - usedKg;
  const overKg = usedKg - carcassKg;
  // شرط قابل للإطفاء من لوحة الإعدادات، مع سماحية تقريب قابلة للتعديل
  const isOver =
    RULES.blockOverCarcass !== false && overKg > (Number(RULES.toleranceKg) || 0.05);

  /* النِّسب من وزن الذبيحة */
  const pctOf = useCallback(
    (v) => (carcassKg > 0 ? (v / carcassKg) * 100 : 0),
    [carcassKg]
  );
  const netYieldPct = pctOf(cutsKg);   // نسبة التصافي
  const wastePct = pctOf(wasteKg);     // نسبة الهدر والعضم

  /* النسبة الفعلية لكل قطعة — تغذّي لوحة النِّسب المرجعية */
  const actualPct = useMemo(() => {
    const out = {};
    CUTS.forEach((c) => {
      const w = num(values[c.id]?.w);
      if (w > 0 && carcassKg > 0) out[c.id] = (w / carcassKg) * 100;
    });
    return out;
  }, [values, carcassKg, CUTS]);

  const outOfRange =
    RULES.warnOutOfRange !== false &&
    !!animal && carcassKg > 0 && (carcassKg < animal.min || carcassKg > animal.max);
  const wasteMissing =
    RULES.requireWaste === true && filled.some((x) => !x.cut.weightOnly && x.wasteBoneKg <= 0);
  const canSave = filled.length > 0 && usedKg > 0 && !isOver && !wasteMissing;

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
    setStep("animal");
    refreshTotals(emp);
  };

  const pickAnimal = (a) => {
    setAnimal(a);
    setOrigin(null);
    setStep("origin");
  };

  /* الخروف: بعد المنشأ نعرض 7 كروت (خروف كامل + 6 أجزاء).
     باقي الأنواع تدخل المسار الكامل مباشرة. */
  const pickOrigin = (o) => {
    setOrigin(o);
    setGrade(null);
    setPieces({});
    const list = animal ? gradesFor(cfg, animal.id, o.id) : [];
    if (list.length) return setStep("grade");
    setStep(animal?.id === "sheep" ? "piece" : "carcass");
  };

  const pickGrade = (g) => {
    setGrade(g);
    setStep(animal?.id === "sheep" ? "piece" : "carcass");
  };

  const setPieceVal = (id, key, v) =>
    setPieces((prev) => ({ ...prev, [id]: { ...prev[id], [key]: v } }));

  /* الأجزاء المعبّأة + مجاميعها */
  const filledPieces = useMemo(
    () =>
      SHEEP_PIECES.filter((p) => !p.whole)
        .map((p) => ({
          piece: p,
          weightKg: num(pieces[p.id]?.w),
          wasteBoneKg: num(pieces[p.id]?.waste),
        }))
        .filter((x) => x.weightKg > 0 || x.wasteBoneKg > 0),
    [pieces, SHEEP_PIECES]
  );
  const piecesKg = filledPieces.reduce((s, x) => s + x.weightKg, 0);
  const piecesWasteKg = filledPieces.reduce((s, x) => s + x.wasteBoneKg, 0);
  const piecesTotal = piecesKg + piecesWasteKg;

  const goCuts = () => {
    if (!carcassKg) return;
    setValues({});
    setError("");
    setStep("cuts");
  };

  /* ── لوحة الأرقام: تكتب في الحقل النشط ── */
  const padEnabled = RULES.onScreenKeypad !== false;

  const readField = (f) => {
    if (!f) return "";
    if (f.kind === "emp") return empNo;
    if (f.kind === "carcass") return carcass;
    if (f.kind === "cut") return values[f.id]?.[f.key] || "";
    if (f.kind === "piece") return pieces[f.id]?.[f.key] || "";
    return "";
  };

  const writeField = (f, next) => {
    if (!f) return;
    if (f.kind === "emp") return setEmpNo(next);
    if (f.kind === "carcass") return setCarcass(next);
    if (f.kind === "cut") return setVal(f.id, f.key, next);
    if (f.kind === "piece") return setPieceVal(f.id, f.key, next);
  };

  const padPress = (k) => {
    const f = focusField;
    if (!f) return;
    const cur = String(readField(f) ?? "");
    if (k === "back") return writeField(f, cur.slice(0, -1));
    if (k === "clear") return writeField(f, "");
    if (k === ".") {
      if (f.kind === "emp" || cur.includes(".")) return;
      return writeField(f, cur === "" ? "0." : cur + ".");
    }
    if (cur.replace(".", "").length >= 7) return;   // حماية من أرقام بلا معنى
    writeField(f, cur === "0" ? k : cur + k);
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
        animalId: animal.id,
        animal: animal.ar,
        animalEn: animal.en,
        originId: origin.id,
        origin: origin.ar,
        originEn: origin.en,
        gradeId: grade?.id || "",
        grade: grade?.ar || "",
        gradeEn: grade?.en || "",
        carcassWeightKg: carcassKg,
        mode: "whole",
        cuts: filled.map((x) => ({
          cutId: x.cut.id,
          cut: x.cut.ar,
          cutEn: x.cut.en,
          code: cfgCode(x.cut, animal.id, origin.id, grade?.id),
          weightKg: roundKg(x.weightKg, RULES.roundTo),
          wasteBoneKg: roundKg(x.wasteBoneKg, RULES.roundTo),
          // نسبة القطعة من وزن الذبيحة
          pctOfCarcass: Number(pctOf(x.weightKg).toFixed(2)),
        })),
        cutsTotalKg: Number(cutsKg.toFixed(3)),
        wasteBoneTotalKg: Number(wasteKg.toFixed(3)),
        netYieldPct: Number(netYieldPct.toFixed(2)),  // نسبة التصافي
        wastePct: Number(wastePct.toFixed(2)),        // نسبة الهدر والعضم
        wasteTotalKg: num(values.waste_total?.w),
        boneTotalKg: num(values.bone_total?.w),
        date: RULES.allowBackdate === true ? entryDate : todayStr(),
        butcherName: person?.name || "",
        butcherJob: person?.job || "",
        savedAt: new Date().toISOString(),
      };
      await saveCarcass(payload);
      setSaved({
        animal: nameOf(animal, isAr),
        origin: nameOf(origin, isAr),
        carcassKg, cutsKg, wasteKg, count: cutCount, netYieldPct, wastePct,
      });
      setStep("done");
      refreshTotals(empNo);
    } catch (e) {
      setError(e?.message || t({ en: "Save failed", ar: "فشل الحفظ" }));
    } finally {
      setSaving(false);
    }
  };

  /** حفظ وضع الأجزاء — كل جزء له وزنه وهدره، بلا وزن ذبيحة. */
  const savePieces = async () => {
    if (!filledPieces.length || saving) return;
    setSaving(true);
    setError("");
    try {
      const payload = {
        employeeNo: empNo,
        branch,
        branchAr: branchObj?.ar || "",
        branchEn: branchObj?.en || "",
        animalId: animal.id,
        animal: animal.ar,
        animalEn: animal.en,
        originId: origin.id,
        origin: origin.ar,
        originEn: origin.en,
        gradeId: grade?.id || "",
        grade: grade?.ar || "",
        gradeEn: grade?.en || "",
        mode: "pieces",              // وضع الأجزاء (مقابل "whole")
        carcassWeightKg: 0,
        cuts: filledPieces.map((x) => ({
          cutId: x.piece.id,
          cut: x.piece.ar,
          cutEn: x.piece.en,
          code: cfgCode(x.piece, animal.id, origin.id, grade?.id),
          weightKg: roundKg(x.weightKg, RULES.roundTo),
          wasteBoneKg: roundKg(x.wasteBoneKg, RULES.roundTo),
        })),
        cutsTotalKg: Number(piecesKg.toFixed(3)),
        wasteBoneTotalKg: Number(piecesWasteKg.toFixed(3)),
        wastePct: piecesTotal > 0 ? Number(((piecesWasteKg / piecesTotal) * 100).toFixed(2)) : 0,
        date: RULES.allowBackdate === true ? entryDate : todayStr(),
        butcherName: person?.name || "",
        butcherJob: person?.job || "",
        savedAt: new Date().toISOString(),
      };
      await saveCarcass(payload);
      setSaved({
        animal: nameOf(animal, isAr),
        origin: nameOf(origin, isAr),
        carcassKg: 0,
        cutsKg: piecesKg,
        wasteKg: piecesWasteKg,
        count: filledPieces.length,
        netYieldPct: piecesTotal > 0 ? (piecesKg / piecesTotal) * 100 : 0,
        wastePct: piecesTotal > 0 ? (piecesWasteKg / piecesTotal) * 100 : 0,
        pieces: true,
      });
      setStep("done");
      refreshTotals(empNo);
    } catch (e) {
      setError(e?.message || t({ en: "Save failed", ar: "فشل الحفظ" }));
    } finally {
      setSaving(false);
    }
  };

  const newEntry = () => {
    setEntryDate(todayStr());
    setAnimal(null);
    setOrigin(null);
    setGrade(null);
    setCarcass("");
    setValues({});
    setPieces({});
    setError("");
    setSaved(null);
    setStep("animal");
  };

  const back = () => {
    if (step === "animal") { setStep("emp"); return; }
    if (step === "origin") { setStep("animal"); return; }
    if (step === "grade") { setStep("origin"); return; }
    if (step === "piece") { setStep(gradeList.length ? "grade" : "origin"); return; }
    if (step === "carcass") {
      if (animal?.id === "sheep") return setStep("piece");
      return setStep(gradeList.length ? "grade" : "origin");
    }
    if (step === "cuts") { setStep("carcass"); return; }
  };

  const KG = t({ en: "kg", ar: "كجم" });

  // الكشك (بلا حساب) يمرّ دائماً — isItemAllowed ترجع true بلا قائمة تقييد
  if (!canOpenButcherPage("butcher.entry")) return <NoAccess page="butcher.entry" />;

  /* ------- العرض ------- */

  return (
    <div dir={dir} className="bt" style={S.page}>
      <style>{CSS}</style>
      <div style={{ ...S.wrap, ...(["piece", "cuts"].includes(step) ? S.wrapWide : null) }}>
        <div style={S.header}>
          <div className="bt-title" style={S.title}>
            🔪 {t({ en: "Butcher", ar: "الجزار" })}
          </div>
          <div style={S.headerRight}>
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
          <StepBar step={step} isSheep={animal?.id === "sheep"} hasGrade={gradeList.length > 0} t={t} />
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
            {animal && <span className="bt-chip" style={S.crumb}>{nameOf(animal, isAr)}</span>}
            {origin && <span className="bt-chip" style={S.crumb}>{nameOf(origin, isAr)}</span>}
            {grade && <span className="bt-chip" style={S.crumb}>{nameOf(grade, isAr)}</span>}
            {step === "cuts" && carcassKg > 0 && (
              <span className="bt-chip" style={S.crumb}>
                {t({ en: "Carcass", ar: "الذبيحة" })}: {carcassKg.toFixed(2)} {KG}
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
              onFocus={() => setFocusField({ kind: "emp" })}
              inputMode={padEnabled ? "none" : "numeric"}
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
                  en: "This employee number is not registered. Ask the supervisor to add it in Settings.",
                  ar: "هذا الرقم الوظيفي غير مسجّل. راجع المشرف لإضافته من الإعدادات.",
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
            {RULES.allowBackdate === true && (
              <>
                <div className="bt-q" style={S.q}>{t({ en: "Date", ar: "التاريخ" })}</div>
                <input
                  className="bt-cutnum"
                  type="date"
                  value={entryDate}
                  max={todayStr()}
                  onChange={(e) => setEntryDate(e.target.value)}
                  style={S.select}
                />
              </>
            )}
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

        {/* 2 — النوع */}
        {step === "animal" && (
          <>
            <div className="bt-q" style={S.q}>{t({ en: "Choose type", ar: "اختر النوع" })}</div>
            <div style={S.grid}>
              {ANIMALS.map((a) => (
                <button key={a.id} className="bt-press" onClick={() => pickAnimal(a)} style={S.tile}>
                  <span style={S.art}><ButcherArt id={a.id} /></span>
                  <span className="bt-name" style={S.name}>{nameOf(a, isAr)}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {/* 3 — المنشأ */}
        {step === "origin" && (
          <>
            <div className="bt-q" style={S.q}>{t({ en: "Origin", ar: "المنشأ" })}</div>
            <div style={S.grid}>
              {originList.map((o) => (
                <button key={o.id} className="bt-press" onClick={() => pickOrigin(o)} style={S.tileOrigin}>
                  <span className="bt-name" style={S.name}>{nameOf(o, isAr)}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {/* 3.2 — درجة اللحم (لامب / هوغيت / موتون) */}
        {step === "grade" && (
          <>
            <div className="bt-q" style={S.q}>{t({ en: "Grade", ar: "الدرجة" })}</div>
            <div style={S.grid}>
              {gradeList.map((g) => (
                <button
                  key={g.id}
                  className="bt-press"
                  onClick={() => pickGrade(g)}
                  style={S.tileOrigin}
                >
                  <span style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <span className="bt-name" style={S.name}>{nameOf(g, isAr)}</span>
                    <span className="bt-lbl" style={{ color: "#6b8299", fontWeight: 800 }}>
                      {isAr ? g.en : g.ar}
                    </span>
                    {cfgCode(SHEEP_PIECES.find((p) => p.whole) || {}, animal.id, origin.id, g.id) && (
                      <span className="bt-lbl" style={S.code}>
                        {cfgCode(SHEEP_PIECES.find((p) => p.whole) || {}, animal.id, origin.id, g.id)}
                      </span>
                    )}
                  </span>
                </button>
              ))}
            </div>
          </>
        )}

        {/* 3.5 — الخروف: الذبيحة الكاملة (منفصلة فوق) أو قطع مفردة */}
        {step === "piece" && (
          <>
            {/* ── الجزء الكبير: خروف كامل ── */}
            <div className="bt-lbl" style={S.sectionLbl}>
              {t({ en: "The whole animal", ar: "الذبيحة الكاملة" })}
            </div>
            {(() => {
              const whole = SHEEP_PIECES.find((p) => p.whole);
              const code = cfgCode(whole, animal.id, origin.id, grade?.id);
              return (
                <button className="bt-press" onClick={() => setStep("carcass")} style={S.hero}>
                  <span style={S.heroArt}><ButcherArt id={whole.art} /></span>
                  <span style={S.heroBody}>
                    <span className="bt-q" style={S.heroTitle}>{nameOf(whole, isAr)}</span>
                    <span className="bt-lbl" style={S.heroSub}>
                      {t({
                        en: "Weigh the full carcass, then split it across all cuts",
                        ar: "وزن الذبيحة كاملة، وبعدها توزيع كل القطع",
                      })}
                    </span>
                    <span style={S.heroChips}>
                      {code && <span className="bt-lbl" style={S.code}>{code}</span>}
                      <span className="bt-lbl" style={S.code}>
                        {animal.min}–{animal.max} {KG}
                      </span>
                    </span>
                    <span className="bt-sum" style={S.heroGo}>
                      {t({ en: "Start", ar: "ابدأ" })} ←
                    </span>
                  </span>
                </button>
              );
            })()}

            {/* ── فاصل ── */}
            <div style={S.divider}>
              <span className="bt-lbl" style={S.dividerText}>
                {t({ en: "or individual pieces", ar: "أو قطع مفردة" })}
              </span>
            </div>

            <div className="bt-2col">
              <div>
                <div style={S.grid}>
                  {SHEEP_PIECES.filter((p) => !p.whole).map((p) => {
                    const code = cfgCode(p, animal.id, origin.id, grade?.id);
                    const v = pieces[p.id] || {};
                    const w = num(v.w);
                    const waste = num(v.waste);
                    const active = w > 0 || waste > 0;
                    const total = w + waste;
                    return (
                      <div key={p.id} style={{ ...S.cutCard, ...(active ? S.cutCardOn : null) }}>
                        <span style={S.art}><ButcherArt id={p.art} /></span>
                        <span className="bt-name" style={S.name}>{nameOf(p, isAr)}</span>
                        {code && <span className="bt-lbl" style={S.code}>{code}</span>}
                        <label style={S.field}>
                          <span className="bt-lbl" style={S.lbl}>{t({ en: "Weight", ar: "الوزن" })}</span>
                          <input
                            className="bt-cutnum"
                            value={v.w || ""}
                            onChange={(e) => setPieceVal(p.id, "w", e.target.value)}
                            onFocus={() => setFocusField({ kind: "piece", id: p.id, key: "w" })}
                            inputMode={padEnabled ? "none" : "decimal"}
                            placeholder="0.00"
                            style={S.cutInput}
                          />
                        </label>
                        <label style={S.field}>
                          <span className="bt-lbl" style={S.lbl}>
                            {t({ en: "Waste & bone", ar: "الهدر والعضم" })}
                          </span>
                          <input
                            className="bt-cutnum"
                            value={v.waste || ""}
                            onChange={(e) => setPieceVal(p.id, "waste", e.target.value)}
                            onFocus={() => setFocusField({ kind: "piece", id: p.id, key: "waste" })}
                            inputMode={padEnabled ? "none" : "decimal"}
                            placeholder="0.00"
                            style={S.cutInput}
                          />
                        </label>
                        {total > 0 && (
                          <span className="bt-lbl" style={S.pct}>
                            {t({ en: "Waste", ar: "هدر" })} {((waste / total) * 100).toFixed(1)}%
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="bt-sum" style={S.sumBar}>
                  <span>{t({ en: "Pieces", ar: "القطع" })}: <b>{piecesKg.toFixed(2)}</b> {KG}</span>
                  <span>{t({ en: "Waste & bone", ar: "الهدر والعضم" })}: <b>{piecesWasteKg.toFixed(2)}</b> {KG}</span>
                  <span>
                    {t({ en: "Waste %", ar: "نسبة الهدر" })}:{" "}
                    <b>{piecesTotal > 0 ? ((piecesWasteKg / piecesTotal) * 100).toFixed(1) : "0.0"}%</b>
                  </span>
                </div>

                {error && <div className="bt-sum" style={S.error}>{error}</div>}

                <button
                  className="bt-btn"
                  onClick={savePieces}
                  disabled={!filledPieces.length || saving}
                  style={{
                    ...S.primary, marginTop: 14,
                    ...(filledPieces.length && !saving ? null : S.disabled),
                  }}
                >
                  {saving
                    ? t({ en: "Saving…", ar: "جارٍ الحفظ…" })
                    : `${t({ en: "Save", ar: "حفظ" })} (${filledPieces.length})`}
                </button>
              </div>

              <aside className="bt-aside">
                <RefPanel
                  t={t}
                  isAr={isAr}
                  items={SHEEP_PIECES.filter((p) => !p.whole)}
                  actual={null}
                  animalId={animal?.id}
                />
              </aside>
            </div>
          </>
        )}

        {/* 4 — وزن الذبيحة قبل التقطيع */}
        {step === "carcass" && (
          <div style={S.card}>
            <div className="bt-q" style={S.q}>
              {t({ en: "Carcass weight before cutting (kg)", ar: "وزن الذبيحة قبل التقطيع (كجم)" })}
            </div>
            <input
              className="bt-num"
              value={carcass}
              onChange={(e) => setCarcass(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && goCuts()}
              onFocus={() => setFocusField({ kind: "carcass" })}
              inputMode={padEnabled ? "none" : "decimal"}
              autoFocus
              placeholder="0.00"
              style={S.input}
            />
            {outOfRange && (
              <div className="bt-sum" style={S.warn}>
                ⚠️ {isAr
                  ? `وزن غير معتاد لـ${animal.ar} — المتوقع بين ${animal.min} و ${animal.max} كجم. تأكّد من الرقم.`
                  : `Unusual weight for ${animal.en} — expected between ${animal.min} and ${animal.max} kg. Please check.`}
              </div>
            )}
            <button
              className="bt-btn"
              onClick={goCuts}
              disabled={!carcassKg}
              style={{
                ...S.primary,
                ...(carcassKg ? null : S.disabled),
                ...(carcassKg && outOfRange ? S.primaryWarn : null),
              }}
            >
              {outOfRange
                ? t({ en: "Continue anyway", ar: "متابعة رغم ذلك" })
                : t({ en: "Next", ar: "التالي" })}
            </button>
          </div>
        )}

        {/* 5 — القطع */}
        {step === "cuts" && (
          <>
            <div className="bt-q" style={S.q}>{t({ en: "Cut weights", ar: "أوزان القطع" })}</div>
            <div className="bt-2col">
            <div>
            <div style={S.grid}>
              {CUTS.map((c) => {
                const v = values[c.id] || {};
                const w = num(v.w);
                const active = w > 0 || num(v.waste) > 0;
                return (
                  <div
                    key={c.id}
                    className="bt-press"
                    style={{
                      ...S.cutCard,
                      ...(active ? S.cutCardOn : null),
                      ...refTone(cfgRef(c, animal?.id), w > 0 && carcassKg > 0 ? pctOf(w) : null),
                    }}
                  >
                    <span style={S.art}><ButcherArt id={c.id} /></span>
                    <span className="bt-name" style={S.name}>{nameOf(c, isAr)}</span>
                    {cfgCode(c, animal?.id, origin?.id, grade?.id) && (
                      <span className="bt-lbl" style={S.code}>{cfgCode(c, animal.id, origin.id)}</span>
                    )}
                    {w > 0 && carcassKg > 0 && (
                      <span className="bt-lbl" style={S.pct}>
                        {pctOf(w).toFixed(1)}% {t({ en: "of carcass", ar: "من الذبيحة" })}
                      </span>
                    )}
                    <label style={S.field}>
                      <span className="bt-lbl" style={S.lbl}>{t({ en: "Weight", ar: "الوزن" })}</span>
                      <input
                        className="bt-cutnum"
                        value={v.w || ""}
                        onChange={(e) => setVal(c.id, "w", e.target.value)}
                        onFocus={() => setFocusField({ kind: "cut", id: c.id, key: "w" })}
                        inputMode={padEnabled ? "none" : "decimal"}
                        placeholder="0.00"
                        style={S.cutInput}
                      />
                    </label>
                    {!c.weightOnly && (
                      <label style={S.field}>
                        <span className="bt-lbl" style={S.lbl}>
                          {t({ en: "Waste & bone", ar: "الهدر والعضم" })}
                        </span>
                        <input
                          className="bt-cutnum"
                          value={v.waste || ""}
                          onChange={(e) => setVal(c.id, "waste", e.target.value)}
                          onFocus={() => setFocusField({ kind: "cut", id: c.id, key: "waste" })}
                          inputMode={padEnabled ? "none" : "decimal"}
                          placeholder="0.00"
                          style={S.cutInput}
                        />
                      </label>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="bt-sum" style={{ ...S.sumBar, ...(isOver ? S.sumBarOver : null) }}>
              <ProgressRing used={usedKg} total={carcassKg} over={isOver} t={t} />
              <span>{t({ en: "Cuts", ar: "القطع" })}: <b>{cutsKg.toFixed(2)}</b></span>
              <span>{t({ en: "Waste & bone", ar: "الهدر والعضم" })}: <b>{wasteKg.toFixed(2)}</b></span>
              <span>{t({ en: "Carcass", ar: "الذبيحة" })}: <b>{carcassKg.toFixed(2)}</b></span>
              <span style={isOver ? S.overText : null}>
                {t({ en: "Remaining", ar: "المتبقي" })}: <b>{remainingKg.toFixed(2)}</b> {KG}
              </span>
            </div>

            {/* النِّسب من وزن الذبيحة */}
            <div className="bt-sum" style={S.pctBar}>
              <span>
                {t({ en: "Net yield", ar: "نسبة التصافي" })}: <b>{netYieldPct.toFixed(1)}%</b>
              </span>
              <span>
                {t({ en: "Waste & bone %", ar: "نسبة الهدر والعضم" })}: <b>{wastePct.toFixed(1)}%</b>
              </span>
            </div>

            {wasteMissing && (
              <div className="bt-sum" style={S.warn}>
                {t({
                  en: "Waste & bone is required for every cut you entered.",
                  ar: "إدخال الهدر والعضم إلزامي لكل قطعة أدخلت وزنها.",
                })}
              </div>
            )}
            {isOver && (
              <div className="bt-sum" style={S.error}>
                {isAr
                  ? `المجموع أكبر من وزن الذبيحة بـ ${overKg.toFixed(2)} كجم — صحّح الأوزان قبل الحفظ.`
                  : `Total exceeds the carcass weight by ${overKg.toFixed(2)} kg — fix the weights before saving.`}
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
            </div>

            <aside className="bt-aside">
              <RefPanel t={t} isAr={isAr} items={CUTS} actual={actualPct} animalId={animal?.id} />
            </aside>
            </div>
          </>
        )}

        {/* 6 — تم */}
        {step === "done" && saved && (
          <div style={S.card}>
            <div className="bt-done bt-pop" style={{ textAlign: "center" }}>✅</div>
            <div className="bt-q" style={S.q}>{saved.animal} — {saved.origin}</div>
            <div>
              {!saved.pieces && (
                <div className="bt-sum" style={S.doneRow}>
                  <span>{t({ en: "Carcass weight", ar: "وزن الذبيحة" })}</span>
                  <b>{saved.carcassKg.toFixed(2)} {KG}</b>
                </div>
              )}
              <div className="bt-sum" style={S.doneRow}>
                <span>{t({ en: "Total cuts", ar: "مجموع القطع" })} ({saved.count})</span>
                <b>{saved.cutsKg.toFixed(2)} {KG}</b>
              </div>
              <div className="bt-sum" style={S.doneRow}>
                <span>{t({ en: "Waste & bone", ar: "الهدر والعضم" })}</span>
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

        {["animal", "origin", "grade", "piece", "carcass", "cuts"].includes(step) && (
          <button className="bt-back" onClick={back} style={S.back}>
            {t({ en: "Back", ar: "رجوع" })}
          </button>
        )}

        {/* مساحة تحت المحتوى حتى لا تغطّي اللوحة آخر عنصر */}
        {padEnabled && focusField && <div style={{ height: 330 }} />}
      </div>

      {padEnabled && focusField && (
        <Keypad
          t={t}
          value={readField(focusField)}
          onPress={padPress}
          onClose={() => setFocusField(null)}
        />
      )}
    </div>
  );
}

/* ============================ شريط الخطوات ============================ */

function StepBar({ step, isSheep, hasGrade, t }) {
  const steps = [
    { id: "animal", ar: "النوع", en: "Type" },
    { id: "origin", ar: "المنشأ", en: "Origin" },
    ...(hasGrade ? [{ id: "grade", ar: "الدرجة", en: "Grade" }] : []),
    ...(isSheep ? [{ id: "piece", ar: "الجزء", en: "Piece" }] : []),
    { id: "carcass", ar: "الوزن", en: "Weight" },
    { id: "cuts", ar: "القطع", en: "Cuts" },
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
        {t({ en: "of carcass", ar: "من الذبيحة" })}
      </span>
    </span>
  );
}

/* ============================ لوحة الأرقام ============================ */

function Keypad({ value, onPress, onClose, t }) {
  const keys = ["7", "8", "9", "4", "5", "6", "1", "2", "3", ".", "0", "back"];
  return (
    <div className="bt-pad bt-rise" style={S.pad}>
      <div style={S.padInner}>
        <div style={S.padHead}>
          <span className="bt-pad-key" style={{ fontWeight: 900 }}>{value || "0"}</span>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="bt-pad-lbl bt-press" style={S.padSmall}
              onClick={() => onPress("clear")}>
              {t({ en: "Clear", ar: "مسح" })}
            </button>
            <button className="bt-pad-lbl bt-press" style={{ ...S.padSmall, ...S.padDone }}
              onClick={onClose}>
              {t({ en: "Done", ar: "تم" })}
            </button>
          </div>
        </div>
        <div style={S.padGrid}>
          {keys.map((k) => (
            <button
              key={k}
              type="button"
              className="bt-pad-key bt-press"
              style={{ ...S.padKey, ...(k === "back" ? S.padBack : null) }}
              onClick={() => onPress(k)}
            >
              {k === "back" ? "⌫" : k}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/** لون خلفية كرت القطعة حسب موقع نسبته من المرجع. */
function refTone(ref, actual) {
  if (!ref || actual === null || !Number.isFinite(actual)) return null;
  if (actual < ref.min) return { background: "#fffbeb", borderColor: "#fcd34d" };
  if (actual > ref.max) return { background: "#fef2f2", borderColor: "#fca5a5" };
  return { background: "#f0fdf4", borderColor: "#86efac" };
}

/* ============================ لوحة النِّسب المرجعية ============================ */
/* مرجع للجزّار: كم المفروض تطلع نسبة كل قطعة من وزن الذبيحة.
   actual = خريطة { cutId: نسبة فعلية } أو null (لا مقارنة). */
function RefPanel({ items, actual, isAr, t, animalId }) {
  const list = items
    .map((it) => ({ it, ref: cfgRef(it, animalId) }))
    .filter((x) => x.ref);

  if (!list.length) return null;

  return (
    <div className="bt-ref" style={S.ref}>
      <div className="bt-ref-title" style={S.refTitle}>
        📐 {t({ en: "Target ratios", ar: "النِّسب المرجعية" })}
      </div>
      <div style={S.refNote}>
        {t({
          en: "% of carcass weight — approximate guide, adjust to your cutting spec.",
          ar: "٪ من وزن الذبيحة — إرشادية تقريبية، تُعدَّل حسب مواصفة التقطيع.",
        })}
      </div>
      {list.map(({ it, ref }) => {
        const has = actual && Number.isFinite(actual[it.id]) && actual[it.id] > 0;
        const val = has ? actual[it.id] : null;
        const state = !has ? "idle" : val < ref.min ? "low" : val > ref.max ? "high" : "ok";
        return (
          <div key={it.id} style={S.refRow}>
            <span style={S.refName}>{nameOf(it, isAr)}</span>
            <span style={S.refTarget}>{ref.min}–{ref.max}%</span>
            {has && (
              <span style={{ ...S.refVal, ...REF_STATE[state] }}>
                {state === "ok" ? "✓" : state === "low" ? "↓" : "↑"} {val.toFixed(1)}%
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

const REF_STATE = {
  ok: { background: "#dcfce7", color: "#166534" },
  low: { background: "#fef9c3", color: "#854d0e" },
  high: { background: "#fee2e2", color: "#991b1b" },
  idle: {},
};

/* ============================ الأنماط ============================ */
/* الأحجام النصّية في CSS أعلاه — هنا التخطيط والألوان فقط. */

const FONT = "Cairo, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif";

const S = {
  page: {
    minHeight: "100vh", background: "#eef4fb", fontFamily: FONT, color: "#0f2740",
    padding: "18px 14px 40px", overflowX: "hidden",
  },
  wrap: { maxWidth: 1000, margin: "0 auto" },
  wrapWide: { maxWidth: 1360 },
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 14 },
  headerRight: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" },
  title: { fontWeight: 900 },
  langBtn: { background: "#fff", border: "1px solid #cfe0f0", color: "#1f6fd0", fontSize: 18 },
  emp: { display: "flex", alignItems: "center", gap: 8, fontWeight: 800 },
  chg: {
    border: "1px solid #cfe0f0", background: "#fff", color: "#1f6fd0",
    borderRadius: 10, padding: "7px 14px", fontFamily: FONT, fontWeight: 700, cursor: "pointer",
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
    background: "#fff", border: "3px solid #dbe6f2", borderRadius: 26,
    padding: "14px 16px 18px", display: "flex", flexDirection: "column",
    alignItems: "center", gap: 8, fontFamily: FONT, color: "#0f2740",
  },
  cutCardOn: { border: "3px solid #1f6fd0", background: "#f7fbff" },
  name: { fontWeight: 900 },
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

  pad: {
    background: "rgba(255,255,255,.98)",
    borderTop: "1px solid #dbe6f2",
    boxShadow: "0 -12px 30px rgba(15,39,64,.14)",
    padding: "12px 14px 18px",
    backdropFilter: "blur(6px)",
  },
  padInner: { maxWidth: 560, margin: "0 auto", display: "flex", flexDirection: "column", gap: 10 },
  padHead: {
    display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
    background: "#f5f9fd", border: "1px solid #dbe6f2", borderRadius: 14, padding: "8px 14px",
  },
  padSmall: {
    border: "1px solid #cfe0f0", background: "#fff", color: "#3c5a75",
    borderRadius: 12, padding: "8px 18px", fontWeight: 800, fontFamily: FONT, cursor: "pointer",
  },
  padDone: { background: "#1f6fd0", color: "#fff", border: "none" },
  padGrid: { display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 },
  padKey: {
    border: "1px solid #dbe6f2", background: "#fff", color: "#0f2740",
    borderRadius: 16, padding: "clamp(10px, 2.4vh, 16px) 0",
    fontWeight: 900, fontFamily: FONT, cursor: "pointer",
  },
  padBack: { background: "#f5f9fd", color: "#a12626" },

  doneRow: {
    display: "flex", justifyContent: "space-between", fontWeight: 700,
    padding: "10px 0", borderTop: "1px solid #f0f5fa",
  },
};
