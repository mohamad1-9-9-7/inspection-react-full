// src/pages/mrp/MrpBom.jsx
//
// 2️⃣ قوائم التفكيك والتقطيع (Disassembly / Cutting BOM).
// One input product → many output products + waste, all from the Item Master.
//
// طبيعة الشغل: ذبيحة/منتج واحد داخل → مجموعة قطع ناتجة + هدر (عظم، دهن، فقد).
// كل الأطراف (الداخل · الناتج · الهدر) بتنسحب من سجل الأصناف بالكود الماستر.
//
// 💾 الحفظ: كل قائمة بتنحفظ لحالها بزر «حفظ القائمة» بترويسة الباني —
// ما في شريط حفظ أسفل الصفحة. عمليات الجدول (تفعيل/نسخ/حذف) بتنحفظ فوراً.

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ITEM_TYPES, activeOnly, bomCategoryById, freshId, hasRole, itemById, money,
  mutateConfig, nameOf, num, useMrpConfig, userName,
} from "./mrpApi";
import {
  Badge, Card, EmptyBox, Field, ItemPicker, Kpi, Modal, MrpNoAccess, MrpShell,
  NumInput, S, SearchBox, Select, Switch, Toast, canEditMrp, canOpenMrp,
} from "./mrpUi";
import { useSettingsLang } from "../settings/_shared/settingsI18n";

const PAGE = "mrp.bom";

/** رقم قائمة تقطيع جديد — CUT-0001 حسب الموجود. */
function nextRef(boms) {
  const max = (boms || []).reduce((m, b) => {
    const n = parseInt(String(b.ref || "").replace(/\D/g, ""), 10);
    return Number.isFinite(n) && n > m ? n : m;
  }, 0);
  return `CUT-${String(max + 1).padStart(4, "0")}`;
}

const blankBom = (boms) => ({
  id: freshId("bom"),
  ref: nextRef(boms),
  bomType: "disassembly",
  categoryId: "",
  inputId: "",
  inputQty: 100,
  outputs: [],
  wastes: [],
  // المسارات المتعددة — خيار مستقل لكل وصفة (يُفعّل من داخل باني القائمة نفسها).
  // كل مسار: { id, no, code, name, outputs[], wastes[], notes, active }.
  multiPathways: false,        // No = تفكيك مسطّح تقليدي · Yes = مسارات متعددة لهالوصفة
  requirePathwayWeight: false, // إلزام كل مسار بمخرَج موزون (Qty>0) — اختياري يحدّده المستخدم
  pathways: [],
  pathwaySeq: 0,               // عدّاد تصاعدي ثابت لأكواد المسارات (لا يُعاد ترقيمه بالحذف)
  notes: "",
  active: true,
  requireExactBalance: false,   // إلزام الجزار بتطابق تام: الخام = النواتج + الهدر
  requirePieceCount: false,     // إظهار خانة «عدد القطع» وإلزام الجزار بتعبئتها
  allowSameIO: false,           // السماح بأن يكون المخرَج نفسه المدخل (تنظيف/تشذيب بوزن أقل)
  version: 1,
  history: [],
  createdAt: new Date().toISOString(),
  createdBy: userName(),
});

/** كود المسار الفريد — مربوط هرمياً بكود الـ BOM: CUT-0001-P3. */
const pathwayCode = (bomRef, no) => `${bomRef || "CUT"}-P${no}`;

/** نسخ أسطر قائمة بمعرّفات جديدة — لبذر المسار من منتجات الـ BOM الأساسية. */
const cloneLines = (lines) => (lines || []).map((l) => ({ ...l, id: freshId("ln") }));

/**
 * تحقّق مشترك لقائمة تقطيع واحدة (مسطّحة أو مسار).
 * `label` بادئة رسالة الخطأ — "" للمسطّحة، و«المسار CUT-0001-P1 — » للمسار.
 * يرجّع نص الخطأ أو "" إذا صحيحة.
 */
function cutListError({ inputId, inItemName, outputs, wastes, inputQty, allowSameIO }, cfg, isAr, t, label = "") {
  const all = [...(outputs || []), ...(wastes || [])];
  if ((outputs || []).length === 0) {
    return t({
      en: `${label}A cutting list needs at least one output.`,
      ar: `${label}قائمة التقطيع بدها ناتج واحد على الأقل.`,
    });
  }
  if (all.some((l) => !l.itemId)) {
    return t({
      en: `${label}Every line must pick an item from the master list.`,
      ar: `${label}كل سطر لازم يختار صنف من السجل.`,
    });
  }
  // تطابق المدخل والمخرج — محكوم بمفتاح التجاوز allowSameIO.
  const inOutputs = (outputs || []).filter((l) => l.itemId === inputId);
  const inWastes = (wastes || []).filter((l) => l.itemId === inputId);
  if (!allowSameIO) {
    if (inOutputs.length || inWastes.length) {
      return t({
        en: `${label}"${inItemName}" is the input product — it cannot also be listed as an output or waste. Remove that line.`,
        ar: `${label}«${inItemName}» هو المنتج الداخل — ما بيصير ينضاف كناتج أو هدر كمان. احذف هالسطر.`,
      });
    }
  } else {
    // الهدر ما بيصير يطابق الداخل — التجاوز للمخرجات فقط.
    if (inWastes.length) {
      return t({
        en: `${label}"${inItemName}" is the input product — with the override it can be an output, but never a waste line.`,
        ar: `${label}«${inItemName}» هو المنتج الداخل — مع التجاوز بيصير ناتج، بس أبداً مش سطر هدر.`,
      });
    }
    // تكرار السطر — يُسمح بمطابقة الداخل مرة واحدة فقط بجدول المخرجات.
    if (inOutputs.length > 1) {
      return t({
        en: `${label}"${inItemName}" (same as input) may appear only once in the outputs table.`,
        ar: `${label}«${inItemName}» (نفس الداخل) بيجي مرة وحدة بس بجدول المخرجات.`,
      });
    }
    // شرط انخفاض الوزن — وزن المخرج المطابق لازم < وزن المدخل.
    const line = inOutputs[0];
    if (line && num(inputQty) > 0 && num(line.qty) > 0 && num(line.qty) >= num(inputQty)) {
      return t({
        en: `${label}the same-item output (${money(num(line.qty), 2)}) must weigh LESS than the input (${money(num(inputQty), 2)}) — cleaning/trimming reduces weight.`,
        ar: `${label}وزن المخرج المطابق للداخل (${money(num(line.qty), 2)}) لازم يكون أقل من وزن المدخل (${money(num(inputQty), 2)}) — التنظيف/التشذيب بيقلّل الوزن.`,
      });
    }
  }
  const seen = new Set();
  for (const l of all) {
    if (seen.has(l.itemId)) {
      const it = itemById(cfg, l.itemId);
      return t({
        en: `${label}"${nameOf(it, false) || l.itemId}" is listed twice — each item may appear only once. Merge its lines.`,
        ar: `${label}«${nameOf(it, true) || l.itemId}» موجود بسطرين — كل صنف بيجي مرة وحدة بس. ادمجهم.`,
      });
    }
    seen.add(l.itemId);
  }
  if (bomMath({ inputQty, outputs, wastes }).over) {
    return t({
      en: `${label}Outputs + waste exceed the input quantity — fix the mass balance.`,
      ar: `${label}الناتج + الهدر أكثر من كمية الداخل — صحّح الميزان.`,
    });
  }
  return "";
}

/**
 * توقيع المسار = بصمة هويّته: مجموعة الأصناف المميِّزة اللي كميّتها > 0،
 * بعد استبعاد الأصناف المشتركة المعلَّمة «Any» (دهن أبيض، هدر طبيعي، أكياس…).
 * مساران بنفس التوقيع = متطابقان تماماً → تناقض يُمنع حفظه.
 * (الصنف بـ qty = 0 غائب عن النمط، والصنف Any لا يدخل بالهويّة إطلاقاً.)
 */
function pathwaySignature(pw) {
  const ids = [...(pw?.outputs || []), ...(pw?.wastes || [])]
    .filter((l) => l.itemId && l.any !== true && num(l.qty) > 0)
    .map((l) => l.itemId);
  return JSON.stringify([...new Set(ids)].sort());
}

/** تجميع أرقام القائمة — الداخل، الناتج، الهدر، الفاقد غير المسجّل، والعائد. */
function bomMath(bom) {
  const input = num(bom?.inputQty);
  const out = (bom?.outputs || []).reduce((s, l) => s + num(l.qty), 0);
  const waste = (bom?.wastes || []).reduce((s, l) => s + num(l.qty), 0);
  const loss = input - out - waste;               // فاقد غير مسجّل (تبخّر/انكماش…)
  const yieldPct = input > 0 ? (out / input) * 100 : 0;
  const wastePct = input > 0 ? (waste / input) * 100 : 0;
  // الميزان يُفحص فقط لما يكون في كمية داخل — بلا داخل (هيكل فقط) لا مقارنة
  const over = input > 0 && loss < -1e-6;         // موزّع أكثر من الداخل = خطأ
  return { input, out, waste, loss, yieldPct, wastePct, over };
}

export default function MrpBom() {
  const { t, isAr } = useSettingsLang();
  const { cfg, setCfg, loading } = useMrpConfig();

  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);
  const [q, setQ] = useState("");
  const [catFilter, setCatFilter] = useState("");
  const [draft, setDraft] = useState(null);   // { mode: "new"|"edit", bom, dirty }
  const [historyFor, setHistoryFor] = useState("");

  const canEdit = canEditMrp();
  const toastTimer = useRef(null);

  const flash = (text, bad) => {
    setToast({ text, bad: !!bad });
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 3600);
  };

  /**
   * تعديل + حفظ فوري مستقل — اقرأ أحدث نسخة من السيرفر ثم عدّل ثم احفظ،
   * حتى ما تندهس قائمة عدّلها جهاز تاني بنفس الوقت.
   */
  const commit = async (fn, okMsg) => {
    if (busy) return false;
    setBusy(true);
    try {
      const saved = await mutateConfig((next) => {
        if (!Array.isArray(next.boms)) next.boms = [];
        fn(next);
      });
      setCfg(saved);
      if (okMsg) flash(okMsg);
      return true;
    } catch (e) {
      flash(`${t({ en: "Save failed", ar: "فشل الحفظ" })}: ${e?.message || e}`, true);
      return false;
    } finally {
      setBusy(false);
    }
  };

  /* ── فتح/إنشاء ── */
  const openNew = () => setDraft({ mode: "new", bom: blankBom(cfg.boms), dirty: false });

  const openBom = (b) => {
    const legacy = b.bomType !== "disassembly" && (b.lines || []).length > 0;
    // قائمة تصنيع قديمة: التحويل بيشيلها من أوامر التصنيع — لازم قرار صريح
    if (legacy && !window.confirm(t({
      en: `${b.ref} is an old manufacturing BOM.\nOpening it here converts it to a cutting BOM when you save, and work orders will stop using it.\n\nContinue?`,
      ar: `${b.ref} قائمة تصنيع قديمة.\nفتحها هون بيحوّلها لقائمة تقطيع وقت ما تحفظ، وأوامر التصنيع بتوقف تستعملها.\n\nمتابعة؟`,
    }))) return;
    setDraft({
      mode: "edit",
      // نضمن حقول التفكيك حتى للسجلات القديمة — بلا دهس باقي الحقول
      bom: {
        outputs: [], wastes: [], inputId: "", inputQty: "",
        multiPathways: false, requirePathwayWeight: false, pathways: [], pathwaySeq: 0, allowSameIO: false,
        ...JSON.parse(JSON.stringify(b)),
        bomType: "disassembly",
      },
      dirty: false,
    });
  };

  const closeBuilder = () => {
    if (draft?.dirty && !window.confirm(t({
      en: "Discard unsaved changes to this BOM?",
      ar: "تجاهل التعديلات غير المحفوظة على هذه القائمة؟",
    }))) return;
    setDraft(null);
  };

  /** إضافة فئة وصفة جديدة (مستقلّة عن فئات الأصناف) وإرجاع معرّفها لاختيارها. */
  const addBomCategory = async () => {
    const name = window.prompt(t({ en: "New recipe category name", ar: "اسم فئة الوصفة الجديدة" }));
    const label = String(name || "").trim();
    if (!label) return "";
    const existing = (cfg.bomCategories || []).find(
      (c) => (nameOf(c, isAr) || c.en || c.ar || "").trim().toLowerCase() === label.toLowerCase()
    );
    if (existing) return existing.id;
    const id = freshId("bcat");
    const ok = await commit(
      (next) => {
        if (!Array.isArray(next.bomCategories)) next.bomCategories = [];
        next.bomCategories.push({ id, ar: label, en: label, active: true });
      },
      t({ en: "Category added.", ar: "تمت إضافة الفئة." })
    );
    return ok ? id : "";
  };

  const patch = (p) => setDraft((d) => ({ ...d, dirty: true, bom: { ...d.bom, ...p } }));
  const patchList = (list, id, p) =>
    setDraft((d) => ({
      ...d, dirty: true,
      bom: { ...d.bom, [list]: (d.bom[list] || []).map((l) => (l.id === id ? { ...l, ...p } : l)) },
    }));
  const addTo = (list) =>
    setDraft((d) => ({
      ...d, dirty: true,
      bom: { ...d.bom, [list]: [...(d.bom[list] || []), { id: freshId("ln"), itemId: "", qty: "" }] },
    }));
  const dropFrom = (list, id) =>
    setDraft((d) => ({
      ...d, dirty: true,
      bom: { ...d.bom, [list]: (d.bom[list] || []).filter((l) => l.id !== id) },
    }));

  /* ── مسارات التوزيع المتعددة (تعديل المسودّة) ── */

  /**
   * إضافة مسار جديد بكود فريد مربوط بكود الـ BOM (CUT-0001-P{n}).
   * يُبذَر بنفس منتجات/هدر الـ BOM الأساسية حتى يبلّش الجزار من نفس القائمة.
   */
  const addPathway = () =>
    setDraft((d) => {
      const no = num(d.bom.pathwaySeq, 0) + 1;
      const pw = {
        id: freshId("pw"), no,
        code: pathwayCode(d.bom.ref, no),
        name: "",
        outputs: cloneLines(d.bom.outputs),
        wastes: cloneLines(d.bom.wastes),
        notes: "", active: true,
      };
      return {
        ...d, dirty: true,
        bom: { ...d.bom, pathwaySeq: no, pathways: [...(d.bom.pathways || []), pw] },
      };
    });

  /**
   * تفعيل/تعطيل المسارات المتعددة لهالوصفة. عند التفعيل بلا مسارات:
   * يُنشأ أول مسار مبذور من منتجات الـ BOM الأساسية (نفس المنتجات الظاهرة).
   */
  const toggleMultiPathways = (v) =>
    setDraft((d) => {
      const bom = { ...d.bom, multiPathways: v };
      if (v && (bom.pathways || []).length === 0) {
        const no = num(bom.pathwaySeq, 0) + 1;
        bom.pathwaySeq = no;
        bom.pathways = [{
          id: freshId("pw"), no, code: pathwayCode(bom.ref, no),
          name: "", outputs: cloneLines(bom.outputs), wastes: cloneLines(bom.wastes),
          notes: "", active: true,
        }];
      }
      return { ...d, dirty: true, bom };
    });

  const patchPathway = (pid, p) =>
    setDraft((d) => ({
      ...d, dirty: true,
      bom: {
        ...d.bom,
        pathways: (d.bom.pathways || []).map((pw) => (pw.id === pid ? { ...pw, ...p } : pw)),
      },
    }));

  const dropPathway = (pid) =>
    setDraft((d) => ({
      ...d, dirty: true,
      bom: { ...d.bom, pathways: (d.bom.pathways || []).filter((pw) => pw.id !== pid) },
    }));

  const addPathwayLine = (pid, list) =>
    setDraft((d) => ({
      ...d, dirty: true,
      bom: {
        ...d.bom,
        pathways: (d.bom.pathways || []).map((pw) =>
          pw.id === pid
            ? { ...pw, [list]: [...(pw[list] || []), { id: freshId("ln"), itemId: "", qty: "" }] }
            : pw),
      },
    }));

  const patchPathwayLine = (pid, list, lid, p) =>
    setDraft((d) => ({
      ...d, dirty: true,
      bom: {
        ...d.bom,
        pathways: (d.bom.pathways || []).map((pw) =>
          pw.id === pid
            ? { ...pw, [list]: (pw[list] || []).map((l) => (l.id === lid ? { ...l, ...p } : l)) }
            : pw),
      },
    }));

  const dropPathwayLine = (pid, list, lid) =>
    setDraft((d) => ({
      ...d, dirty: true,
      bom: {
        ...d.bom,
        pathways: (d.bom.pathways || []).map((pw) =>
          pw.id === pid ? { ...pw, [list]: (pw[list] || []).filter((l) => l.id !== lid) } : pw),
      },
    }));

  /* ── تحقق قبل الحفظ ── */
  const validate = (bom) => {
    if (!bom.inputId) {
      return t({ en: "Pick the input product first.", ar: "اختر المنتج الداخل أولاً." });
    }
    const inItem = itemById(cfg, bom.inputId);
    // مسموح كمُدخل إذا بيلعب دور خام أو مكوّن — حتى لو كان كمان نهائي (منتج وسيط).
    // ممنوع فقط إذا كان نهائي فقط / هدر فقط بلا أي دور خام أو مكوّن.
    if (inItem && !(hasRole(inItem, "raw") || hasRole(inItem, "component"))) {
      return t({
        en: `"${nameOf(inItem, false) || bom.inputId}" is a finished/waste item — the input must be (or also be) a raw material or a component.`,
        ar: `«${nameOf(inItem, true) || bom.inputId}» نهائي/هدر فقط — الداخل لازم يكون (أو يكون كمان) مادة خام أو مكوّن.`,
      });
    }
    // الكميات اختيارية — بتقدر تحفظ الهيكل (الداخل + النواتج) وتعبّي الأوزان لاحقاً
    const inItemName = nameOf(inItem, isAr) || bom.inputId;

    // وضع المسارات المتعددة — كل مسار يُتحقّق لوحده بنفس قواعد القائمة المسطّحة.
    if (bom.multiPathways === true) {
      const pws = bom.pathways || [];
      if (pws.length === 0) {
        return t({
          en: "Multi-routing is on — add at least one routing pathway.",
          ar: "المسارات المتعددة مفعّلة — أضف مسار توزيع واحد على الأقل.",
        });
      }
      const requireWeight = bom.requirePathwayWeight === true;
      const sigs = new Map();   // توقيع الهويّة (غير الفارغ) → كود المسار الأول اللي حمله
      for (const pw of pws) {
        const label = `${t({ en: "Pathway", ar: "المسار" })} ${pw.code || pw.name || ""} — `;
        const err = cutListError(
          { inputId: bom.inputId, inItemName, outputs: pw.outputs, wastes: pw.wastes, inputQty: bom.inputQty, allowSameIO: bom.allowSameIO === true },
          cfg, isAr, t, label
        );
        if (err) return err;

        const sig = pathwaySignature(pw);
        // الشرط اختياري: لو مطلوب، كل مسار لازم مخرَج مميِّز واحد على الأقل (qty>0).
        if (requireWeight && sig === "[]") {
          return t({
            en: `${label}has no weighed output — give at least one non-shared cut a quantity > 0 (shared items marked “Any” don’t count).`,
            ar: `${label}بلا مخرَج موزون — أعطِ قطعة واحدة غير مشتركة كمية > 0 (الأصناف المعلَّمة «Any» ما بتُحسب).`,
          });
        }
        // المنع التلقائي للتناقض — ممنوع مساران بنفس نمط المخرجات المميِّزة (غير الفارغ) تماماً.
        // التوقيعات الفارغة (بلا كميات بعد) مسموحة ولا تدخل بفحص التناقض.
        if (sig !== "[]") {
          if (sigs.has(sig)) {
            const other = sigs.get(sig);
            return t({
              en: `Conflict: pathways ${other} and ${pw.code || pw.name || ""} have the exact same distinguishing outputs — each pathway must be unique. Change a quantity (Qty > 0 / Qty = 0) or mark shared items as “Any”.`,
              ar: `تناقض: المساران ${other} و${pw.code || pw.name || ""} إلهم نفس المخرجات المميِّزة تماماً — كل مسار لازم يكون فريد. غيّر كمية (Qty > 0 / Qty = 0) أو علّم الأصناف المشتركة كـ«Any».`,
            });
          }
          sigs.set(sig, pw.code || pw.name || "");
        }
      }
      return "";
    }

    return cutListError(
      { inputId: bom.inputId, inItemName, outputs: bom.outputs, wastes: bom.wastes, inputQty: bom.inputQty, allowSameIO: bom.allowSameIO === true },
      cfg, isAr, t, ""
    );
  };

  const saveBom = async () => {
    const bom = { ...draft.bom, updatedAt: new Date().toISOString(), updatedBy: userName() };
    const err = validate(bom);
    if (err) { flash(err, true); return; }
    const isNew = draft.mode === "new";
    const ok = await commit(
      (n) => {
        const i = n.boms.findIndex((x) => x.id === bom.id);
        if (i >= 0) n.boms[i] = bom; else n.boms.push(bom);
      },
      t({ en: `${bom.ref} saved.`, ar: `تم حفظ ${bom.ref}.` })
    );
    if (ok) setDraft({ mode: "edit", bom, dirty: false });
    return ok;
  };

  /** إصدار جديد — لقطة من النسخة المحفوظة ثم رفع الرقم (بينحفظ فوراً). */
  const bumpVersion = async () => {
    if (draft.dirty) {
      flash(t({ en: "Save the BOM first, then take a version.", ar: "احفظ القائمة أولاً وبعدين خُد إصدار." }), true);
      return;
    }
    const b = draft.bom;
    const snapshot = {
      version: num(b.version, 1),
      at: new Date().toISOString(),
      by: userName(),
      inputId: b.inputId, inputQty: b.inputQty,
      outputs: JSON.parse(JSON.stringify(b.outputs || [])),
      wastes: JSON.parse(JSON.stringify(b.wastes || [])),
      pathways: JSON.parse(JSON.stringify(b.pathways || [])),
    };
    const bumped = {
      ...b,
      history: [...(b.history || []).slice(-49), snapshot],
      version: num(b.version, 1) + 1,
    };
    const ok = await commit(
      (n) => {
        const i = n.boms.findIndex((x) => x.id === b.id);
        if (i >= 0) n.boms[i] = bumped;
      },
      t({ en: `Version v${bumped.version} opened.`, ar: `تم فتح الإصدار v${bumped.version}.` })
    );
    if (ok) setDraft({ mode: "edit", bom: bumped, dirty: false });
  };

  const restoreVersion = async (snapshot) => {
    if (!window.confirm(t({
      en: `Restore version ${snapshot.version}? The current one stays in the history.`,
      ar: `استرجاع الإصدار ${snapshot.version}؟ الحالي بيضل بالسجل.`,
    }))) return;
    const b = draft.bom;
    const snap = {
      version: num(b.version, 1), at: new Date().toISOString(), by: userName(),
      inputId: b.inputId, inputQty: b.inputQty,
      outputs: JSON.parse(JSON.stringify(b.outputs || [])),
      wastes: JSON.parse(JSON.stringify(b.wastes || [])),
      pathways: JSON.parse(JSON.stringify(b.pathways || [])),
    };
    const restored = {
      ...b,
      history: [...(b.history || []).slice(-49), snap],
      version: num(b.version, 1) + 1,
      inputId: snapshot.inputId,
      inputQty: snapshot.inputQty,
      outputs: JSON.parse(JSON.stringify(snapshot.outputs || [])),
      wastes: JSON.parse(JSON.stringify(snapshot.wastes || [])),
      pathways: JSON.parse(JSON.stringify(snapshot.pathways || [])),
    };
    const ok = await commit(
      (n) => {
        const i = n.boms.findIndex((x) => x.id === b.id);
        if (i >= 0) n.boms[i] = restored;
      },
      t({ en: `Version ${snapshot.version} restored.`, ar: `تم استرجاع الإصدار ${snapshot.version}.` })
    );
    if (ok) {
      setDraft({ mode: "edit", bom: restored, dirty: false });
      setHistoryFor("");
    }
  };

  /* ── عمليات القائمة (حفظ فوري) ── */
  const toggleActive = (b, v) =>
    commit((n) => {
      const x = n.boms.find((y) => y.id === b.id);
      if (x) x.active = v;
    }, v
      ? t({ en: `${b.ref} activated.`, ar: `تم تفعيل ${b.ref}.` })
      : t({ en: `${b.ref} deactivated.`, ar: `تم تعطيل ${b.ref}.` }));

  const duplicateBom = async (b) => {
    const copy = {
      ...JSON.parse(JSON.stringify(b)),
      id: freshId("bom"),
      ref: nextRef(cfg.boms),
      version: 1,
      history: [],
      active: false,
      createdAt: new Date().toISOString(),
      createdBy: userName(),
    };
    const ok = await commit(
      (n) => { n.boms.push(copy); },
      t({ en: `Copied to ${copy.ref} (inactive).`, ar: `تم النسخ إلى ${copy.ref} (معطّلة).` })
    );
    if (ok) setDraft({ mode: "edit", bom: copy, dirty: false });
  };

  const removeBom = async (b) => {
    if (!window.confirm(t({
      en: `Delete ${b.ref}? This is saved immediately.`,
      ar: `حذف ${b.ref}؟ الحذف بينحفظ فوراً.`,
    }))) return;
    const ok = await commit(
      (n) => { n.boms = n.boms.filter((x) => x.id !== b.id); },
      t({ en: `${b.ref} deleted.`, ar: `تم حذف ${b.ref}.` })
    );
    if (ok && draft?.bom?.id === b.id) setDraft(null);
  };

  /* ── جدول القوائم ── */
  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (cfg.boms || [])
      .map((b) => ({
        b,
        input: itemById(cfg, b.inputId),
        math: bomMath(b),
        cat: nameOf(bomCategoryById(cfg, b.categoryId) || {}, isAr),
        legacy: b.bomType !== "disassembly" && (b.lines || []).length > 0,
        pwCount: (b.pathways || []).length,
      }))
      .filter(({ b, input, cat }) => {
        if (catFilter && (b.categoryId || "") !== catFilter) return false;
        if (!needle) return true;
        return [b.ref, input?.sku, input?.ar, input?.en, cat]
          .some((v) => String(v || "").toLowerCase().includes(needle));
      });
  }, [cfg, q, catFilter, isAr]);

  if (!canOpenMrp(PAGE)) return <MrpNoAccess page={PAGE} />;

  const histBom = historyFor && draft ? draft.bom : null;

  return (
    <MrpShell
      pageId={PAGE}
      icon="🔪"
      title={t({ en: "Cutting BOMs", ar: "قوائم التفكيك والتقطيع" })}
      sub={t({
        en: "One input product → output cuts + waste, straight from the item master",
        ar: "منتج واحد داخل → قطع ناتجة + هدر، كله من سجل الأصناف",
      })}
      actions={
        canEdit && !draft && (
          <button type="button" style={{ ...S.btn, ...S.btnPrimary }} onClick={openNew}>
            ＋ {t({ en: "New cutting BOM", ar: "قائمة تقطيع جديدة" })}
          </button>
        )
      }
    >
      <Toast toast={toast} busy={busy} t={t} />

      {!draft ? (
        <Card
          icon="🔪"
          title={t({ en: "All cutting BOMs", ar: "كل قوائم التقطيع" })}
          sub={t({
            en: "Yield % = outputs ÷ input. Activate one BOM per input product.",
            ar: "العائد ٪ = الناتج ÷ الداخل. فعّل قائمة وحدة لكل منتج داخل.",
          })}
          right={
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <SearchBox value={q} onChange={setQ}
                placeholder={t({ en: "Search ref, input or category…", ar: "بحث بالرقم أو الداخل أو الفئة…" })} />
              <select
                style={{
                  ...S.input, width: 175,
                  ...(catFilter ? { borderColor: "#1f6fd0", background: "#f7fbff" } : null),
                }}
                value={catFilter}
                onChange={(e) => setCatFilter(e.target.value)}
              >
                <option value="">{t({ en: "All categories", ar: "كل الفئات" })}</option>
                {activeOnly(cfg.bomCategories).map((c) => (
                  <option key={c.id} value={c.id}>{nameOf(c, isAr) || c.id}</option>
                ))}
              </select>
            </div>
          }
        >
          {loading && !rows.length ? (
            <EmptyBox>{t({ en: "Loading…", ar: "جارٍ التحميل…" })}</EmptyBox>
          ) : rows.length === 0 ? (
            <EmptyBox>
              {t({
                en: "No cutting BOM yet — press “New cutting BOM” to define your first breakdown.",
                ar: "لا توجد قوائم بعد — اضغط «قائمة تقطيع جديدة» لتعريف أول تفكيك.",
              })}
            </EmptyBox>
          ) : (
            <div style={S.tableWrap}>
              <table style={S.table}>
                <thead>
                  <tr>
                    <th style={S.th}>{t({ en: "Ref", ar: "الرقم" })}</th>
                    <th style={S.th}>{t({ en: "Category", ar: "الفئة" })}</th>
                    <th style={S.th}>{t({ en: "Input product", ar: "المنتج الداخل" })}</th>
                    <th style={S.th}>{t({ en: "Input qty", ar: "كمية الداخل" })}</th>
                    <th style={S.th}>{t({ en: "Outputs", ar: "النواتج" })}</th>
                    <th style={S.th}>{t({ en: "Waste", ar: "الهدر" })}</th>
                    <th style={S.th}>{t({ en: "Yield", ar: "العائد" })}</th>
                    <th style={S.th}>{t({ en: "Version", ar: "الإصدار" })}</th>
                    <th style={S.th}>{t({ en: "Active", ar: "مفعّلة" })}</th>
                    <th style={S.th}></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ b, input, math, cat, legacy, pwCount }) => (
                    <tr key={b.id}>
                      <td style={{ ...S.td, fontWeight: 900 }}>
                        {b.ref}
                        {legacy && (
                          <div><Badge color="#b45309" bg="#fffbeb">{t({ en: "legacy", ar: "قديمة" })}</Badge></div>
                        )}
                        {pwCount > 0 && (
                          <div style={{ marginTop: 4 }}>
                            <Badge color="#6d28d9" bg="#f3eefe">
                              🔀 {pwCount} {t({ en: "pathways", ar: "مسار" })}
                            </Badge>
                          </div>
                        )}
                      </td>
                      <td style={S.td}>
                        {cat
                          ? <Badge color="#1f6fd0" bg="#eaf2fc">{cat}</Badge>
                          : <span style={{ color: "#8aa3b8" }}>—</span>}
                      </td>
                      <td style={{ ...S.td, ...S.tdStart }}>
                        {input
                          ? `${input.sku ? `[${input.sku}] ` : ""}${nameOf(input, isAr) || input.id}`
                          : <span style={{ color: "#a12626" }}>⚠️ {t({ en: "no input", ar: "بلا داخل" })}</span>}
                      </td>
                      <td style={S.td}>{math.input ? `${money(math.input, 2)} ${input?.uom || ""}` : "—"}</td>
                      {pwCount > 0 ? (
                        <td style={{ ...S.td, color: "#6d28d9", fontWeight: 800 }} colSpan={3}>
                          🔀 {pwCount} {t({ en: "routing pathways", ar: "مسار توزيع" })}
                        </td>
                      ) : (
                        <>
                          <td style={S.td}>
                            {(b.outputs || []).length}
                            <span style={S.hint}> · {money(math.out, 1)}</span>
                          </td>
                          <td style={S.td}>
                            {(b.wastes || []).length}
                            <span style={S.hint}> · {money(math.waste, 1)}</span>
                          </td>
                          <td style={{
                            ...S.td, fontWeight: 900,
                            color: math.yieldPct >= 60 ? "#047857" : math.yieldPct > 0 ? "#b45309" : "#6b8299",
                          }}>
                            {math.input ? `${math.yieldPct.toFixed(1)}%` : "—"}
                          </td>
                        </>
                      )}
                      <td style={S.td}>
                        <Badge color="#14507f" bg="#eef4fb">v{num(b.version, 1)}</Badge>
                      </td>
                      <td style={S.td}>
                        <Switch
                          checked={b.active !== false}
                          disabled={!canEdit || busy}
                          onChange={(v) => toggleActive(b, v)}
                        />
                      </td>
                      <td style={S.td}>
                        <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap" }}>
                          <button type="button" style={{ ...S.btn, ...S.btnSm }} onClick={() => openBom(b)}>
                            {canEdit ? `✎ ${t({ en: "Open", ar: "فتح" })}` : t({ en: "View", ar: "عرض" })}
                          </button>
                          {canEdit && (
                            <>
                              <button type="button" style={{ ...S.btn, ...S.btnSm, ...(busy ? S.btnOff : null) }}
                                disabled={busy} onClick={() => duplicateBom(b)}
                                title={t({ en: "Duplicate", ar: "نسخ" })}>
                                ⧉
                              </button>
                              <button type="button" style={{ ...S.btn, ...S.btnSm, ...S.btnDanger, ...(busy ? S.btnOff : null) }}
                                disabled={busy} onClick={() => removeBom(b)}>
                                🗑
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      ) : (
        <CutBuilder
          t={t} isAr={isAr} cfg={cfg} draft={draft} canEdit={canEdit} busy={busy}
          notify={flash}
          onBack={closeBuilder}
          onSave={saveBom}
          onDelete={() => removeBom(draft.bom)}
          onBump={bumpVersion}
          onHistory={() => setHistoryFor(draft.bom.id)}
          onAddCategory={addBomCategory}
          patch={patch} patchList={patchList} addTo={addTo} dropFrom={dropFrom}
          pathwayOps={{
            enable: toggleMultiPathways,
            add: addPathway, patch: patchPathway, drop: dropPathway,
            addLine: addPathwayLine, patchLine: patchPathwayLine, dropLine: dropPathwayLine,
          }}
        />
      )}

      {histBom && (
        <Modal
          wide
          icon="🕓"
          title={`${t({ en: "Version history", ar: "سجل الإصدارات" })} — ${histBom.ref}`}
          onClose={() => setHistoryFor("")}
        >
          {(histBom.history || []).length === 0 ? (
            <EmptyBox>{t({ en: "No previous version yet.", ar: "لا يوجد إصدار سابق بعد." })}</EmptyBox>
          ) : (
            <div style={S.tableWrap}>
              <table style={S.table}>
                <thead>
                  <tr>
                    <th style={S.th}>{t({ en: "Version", ar: "الإصدار" })}</th>
                    <th style={S.th}>{t({ en: "Saved at", ar: "الوقت" })}</th>
                    <th style={S.th}>{t({ en: "By", ar: "بواسطة" })}</th>
                    <th style={S.th}>{t({ en: "Outputs", ar: "نواتج" })}</th>
                    <th style={S.th}>{t({ en: "Waste", ar: "هدر" })}</th>
                    <th style={S.th}></th>
                  </tr>
                </thead>
                <tbody>
                  {[...(histBom.history || [])].reverse().map((h, i) => (
                    <tr key={`${h.version}-${i}`}>
                      <td style={{ ...S.td, fontWeight: 900 }}>v{h.version}</td>
                      <td style={S.td}>
                        {new Date(h.at).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" })}
                      </td>
                      <td style={S.td}>{h.by || "—"}</td>
                      <td style={S.td}>{(h.outputs || []).length}</td>
                      <td style={S.td}>{(h.wastes || []).length}</td>
                      <td style={S.td}>
                        {canEdit && (
                          <button type="button" style={{ ...S.btn, ...S.btnSm, ...(busy ? S.btnOff : null) }}
                            disabled={busy} onClick={() => restoreVersion(h)}>
                            ↺ {t({ en: "Restore", ar: "استرجاع" })}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Modal>
      )}
    </MrpShell>
  );
}

/* ══════════════ باني قائمة التقطيع ══════════════ */

function CutBuilder({
  t, isAr, cfg, draft, canEdit, busy, notify,
  onBack, onSave, onDelete, onBump, onHistory, onAddCategory,
  patch, patchList, addTo, dropFrom, pathwayOps,
}) {
  const bom = draft.bom;
  const isNew = draft.mode === "new";
  const input = itemById(cfg, bom.inputId);
  const math = bomMath(bom);
  const uom = input?.uom || "";
  const multiPathways = bom.multiPathways === true;   // خيار مستقل لهالوصفة
  const allowSameIO = bom.allowSameIO === true;       // السماح بمطابقة المدخل والمخرج

  // كل الأصناف المستعملة بالقائمة (نواتج + هدر) — لمنع التكرار عبر السطور
  const usedIds = useMemo(
    () => [...(bom.outputs || []), ...(bom.wastes || [])].map((l) => l.itemId).filter(Boolean),
    [bom.outputs, bom.wastes]
  );

  /**
   * سبب منع صنف بجداول الناتج/الهدر — بيظهر بالقائمة بس ما بينضاف.
   * `listKind`: "outputs" | "wastes" — مع التجاوز، الداخل مسموح كناتج (مرة) بس مش كهدر.
   */
  const lineDisabledForList = (listKind) => (curItemId) => (i) => {
    if (i.id === bom.inputId) {
      if (allowSameIO && listKind === "outputs") {
        if (i.id !== curItemId && usedIds.includes(i.id)) {
          return t({ en: "already added", ar: "مضاف مسبقاً" });
        }
        return "";   // مسموح كمخرَج مطابق للداخل
      }
      return t({ en: "same as input", ar: "هو الداخل" });
    }
    if (i.id !== curItemId && usedIds.includes(i.id)) {
      return t({ en: "already added", ar: "مضاف مسبقاً" });
    }
    return "";
  };
  const onLineBlocked = (i, reason) => {
    const nm = nameOf(i, isAr) || i.sku || i.id;
    if (reason === t({ en: "same as input", ar: "هو الداخل" })) {
      notify?.(t({
        en: `Duplicate: "${nm}" is the input product — it can't also be an output or waste.`,
        ar: `مكرّر: «${nm}» هو المنتج الداخل — ما بيصير يكون ناتج أو هدر كمان.`,
      }), true);
    } else {
      notify?.(t({
        en: `Duplicate: "${nm}" is already added in this BOM.`,
        ar: `مكرّر: «${nm}» مضاف مسبقاً بهالقائمة.`,
      }), true);
    }
  };

  return (
    <>
      <Card
        icon="🔪"
        title={
          <span style={{ display: "inline-flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            {bom.ref} — {input ? nameOf(input, isAr) || input.id : t({ en: "pick the input", ar: "اختر الداخل" })}
            {draft.dirty && (
              <Badge color="#b45309" bg="#fffbeb">● {t({ en: "unsaved", ar: "غير محفوظ" })}</Badge>
            )}
            {isNew && (
              <Badge color="#1f6fd0" bg="#eef4fb">{t({ en: "new — not saved yet", ar: "جديدة — لسا ما انحفظت" })}</Badge>
            )}
          </span>
        }
        sub={t({
          en: "Define how one input breaks into cuts and waste. Nothing is stored until you press Save.",
          ar: "عرّف كيف الداخل بيتفكّك لقطع وهدر. ما بينحفظ إشي قبل ما تضغط حفظ.",
        })}
        right={
          <>
            <button type="button" style={{ ...S.btn, ...S.btnSm }} onClick={onBack}>
              ← {t({ en: "All BOMs", ar: "كل القوائم" })}
            </button>
            {!isNew && (
              <button type="button" style={{ ...S.btn, ...S.btnSm }} onClick={onHistory}>
                🕓 v{num(bom.version, 1)}
              </button>
            )}
            {canEdit && !isNew && (
              <>
                <button type="button" style={{ ...S.btn, ...S.btnSm, ...(busy ? S.btnOff : null) }}
                  disabled={busy} onClick={onBump}>
                  ＋ {t({ en: "New version", ar: "إصدار جديد" })}
                </button>
                <button type="button" style={{ ...S.btn, ...S.btnSm, ...S.btnDanger, ...(busy ? S.btnOff : null) }}
                  disabled={busy} onClick={onDelete}>
                  🗑
                </button>
              </>
            )}
            {canEdit && (
              <button
                type="button"
                style={{ ...S.btn, ...S.btnSm, ...S.btnPrimary, ...(busy || !draft.dirty ? S.btnOff : null) }}
                disabled={busy || !draft.dirty}
                onClick={onSave}
              >
                {busy
                  ? t({ en: "Saving…", ar: "جارٍ الحفظ…" })
                  : `💾 ${t({ en: "Save BOM", ar: "حفظ القائمة" })}`}
              </button>
            )}
          </>
        }
      >
        <fieldset disabled={!canEdit} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
          <div style={S.grid}>
            <Field label={t({ en: "Input product (from item master)", ar: "المنتج الداخل (من سجل الأصناف)" })}>
              <ItemPicker
                cfg={cfg}
                value={bom.inputId}
                onPick={(id) => patch({ inputId: id })}
                isAr={isAr}
                t={t}
                prefer={["raw", "component"]}
                // خام/مكوّن مسموح — حتى لو كان كمان نهائي (منتج وسيط). النهائي فقط/الهدر فقط بيظهر ومحجوب.
                disabledFor={(i) =>
                  !(hasRole(i, "raw") || hasRole(i, "component"))
                    ? t({ en: "finished/waste only — not an input", ar: "نهائي/هدر فقط — مش مدخل" })
                    : ""}
                onBlocked={(i) => notify?.(t({
                  en: `"${nameOf(i, false) || i.sku || i.id}" is a finished/waste-only item — the input must be (or also be) a raw material or a component.`,
                  ar: `«${nameOf(i, true) || i.sku || i.id}» نهائي/هدر فقط — الداخل لازم يكون (أو يكون كمان) مادة خام أو مكوّن.`,
                }), true)}
                placeholder={t({ en: "carcass / primal…", ar: "ذبيحة / قطعة أساسية…" })}
              />
            </Field>
            <Field label={`${t({ en: "Input quantity", ar: "كمية الداخل" })}${uom ? ` (${uom})` : ""}`}>
              <NumInput
                value={bom.inputQty}
                onChange={(v) => patch({ inputQty: v })}
                // يتنسّق لرقمين بعد الفاصلة عند مغادرة الحقل
                onBlur={() => {
                  const v = num(bom.inputQty);
                  if (String(bom.inputQty ?? "").trim() !== "") patch({ inputQty: v.toFixed(2) });
                }}
              />
              <span style={{ ...S.hint, marginTop: 4 }}>
                {num(bom.inputQty) > 0
                  ? `${money(num(bom.inputQty), 2)} ${uom || ""}`
                  : t({ en: "optional — you can fill it later", ar: "اختياري — فيك تعبّيها لاحقاً" })}
              </span>
            </Field>
            <Field label={t({ en: "Category (recipes)", ar: "الفئة (للوصفات)" })}>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Select
                    value={bom.categoryId}
                    onChange={(v) => patch({ categoryId: v })}
                    options={activeOnly(cfg.bomCategories)}
                    isAr={isAr}
                    placeholder={t({ en: "— none —", ar: "— بلا —" })}
                  />
                </div>
                {canEdit && (
                  <button
                    type="button"
                    style={{ ...S.btn, ...S.btnSm }}
                    disabled={busy}
                    onClick={async () => {
                      const id = await onAddCategory();
                      if (id) patch({ categoryId: id });
                    }}
                    title={t({ en: "Add a new recipe category", ar: "إضافة فئة وصفة جديدة" })}
                  >
                    ＋ {t({ en: "New", ar: "جديدة" })}
                  </button>
                )}
              </div>
            </Field>
            <Field label={t({ en: "Notes", ar: "ملاحظات" })}>
              <TextInputLike value={bom.notes} onChange={(v) => patch({ notes: v })} />
            </Field>
          </div>

          {/* ── تفعيل المسارات المتعددة لهالوصفة (خيار مستقل لكل قائمة) ── */}
          <div style={{
            ...S.chipRow, marginTop: 12, padding: "12px 14px", borderRadius: 14,
            border: `1.5px solid ${multiPathways ? "#c9b8f2" : "#e3edf7"}`,
            background: multiPathways ? "#f7f5ff" : "#fafcff",
          }}>
            <label style={{ display: "flex", alignItems: "flex-start", gap: 10, fontWeight: 800, minWidth: 0 }}>
              <Switch
                checked={multiPathways}
                onChange={(v) => pathwayOps.enable(v)}
              />
              <span style={{ minWidth: 0 }}>
                🔀 {t({ en: "Enable multi-routing pathways for this BOM", ar: "تفعيل مسارات التوزيع المتعددة لهالوصفة" })}
                <div style={{ ...S.hint, fontWeight: 700, marginTop: 4 }}>
                  {multiPathways
                    ? t({
                        en: "On — the first pathway starts from the same products as this BOM. Add more alternative breakdowns, each with its own unique code (e.g. CUT-0001-P1).",
                        ar: "مفعّل — أول مسار بيبلّش بنفس منتجات هالوصفة. ضيف تفكيكات بديلة، لكل واحد كود فريد (مثال: CUT-0001-P1).",
                      })
                    : t({
                        en: "Off — this BOM uses a single flat breakdown (input → outputs + waste), the traditional way.",
                        ar: "معطّل — هالوصفة بتستعمل تفكيك مسطّح واحد (داخل → نواتج + هدر)، بالطريقة التقليدية.",
                      })}
                </div>
              </span>
            </label>
          </div>

          {/* ── شرط الوزن للمسار (اختياري) — يحدّده المستخدم ── */}
          {multiPathways && (
            <div style={{
              ...S.chipRow, marginTop: 10, padding: "12px 14px", borderRadius: 14,
              border: `1.5px solid ${bom.requirePathwayWeight === true ? "#c9b8f2" : "#e3edf7"}`,
              background: bom.requirePathwayWeight === true ? "#f7f5ff" : "#fafcff",
            }}>
              <label style={{ display: "flex", alignItems: "flex-start", gap: 10, fontWeight: 800, minWidth: 0 }}>
                <Switch
                  checked={bom.requirePathwayWeight === true}
                  onChange={(v) => patch({ requirePathwayWeight: v })}
                />
                <span style={{ minWidth: 0 }}>
                  ⚖️ {t({ en: "Require a weighed output per pathway (Qty > 0)", ar: "إلزام كل مسار بمخرَج موزون (Qty > 0)" })}
                  <div style={{ ...S.hint, fontWeight: 700, marginTop: 4 }}>
                    {bom.requirePathwayWeight === true
                      ? t({
                          en: "On — each pathway must have at least one distinguishing output with a quantity greater than zero before you can save.",
                          ar: "مفعّل — كل مسار لازم يكون فيه مخرَج مميِّز واحد على الأقل كميّته أكبر من صفر قبل الحفظ.",
                        })
                      : t({
                          en: "Off — quantities are optional (weight ≥ 0). You can save pathways with no quantities yet and fill them later.",
                          ar: "معطّل — الكميات اختيارية (الوزن ≥ 0). فيك تحفظ المسارات بلا كميات وتعبّيها لاحقاً.",
                        })}
                  </div>
                </span>
              </label>
            </div>
          )}

          <div style={{ ...S.chipRow, marginTop: 12 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 9, fontWeight: 800 }}>
              <Switch checked={bom.active !== false} onChange={(v) => patch({ active: v })} />
              {t({ en: "Active BOM", ar: "قائمة مفعّلة" })}
            </label>
            <span style={S.hint}>
              {t({
                en: "Tip: 100 KG input makes every line read directly as a percentage.",
                ar: "نصيحة: داخل ١٠٠ كجم بيخلي كل سطر ينقرأ كنسبة مئوية مباشرة.",
              })}
            </span>
          </div>
          <div style={{ ...S.chipRow, marginTop: 10 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 9, fontWeight: 800 }}>
              <Switch
                checked={bom.requireExactBalance === true}
                onChange={(v) => patch({ requireExactBalance: v })}
              />
              {t({ en: "Require exact balance (raw = products + waste)", ar: "إلزام تطابق تام (الخام = النواتج + الهدر)" })}
            </label>
            <span style={S.hint}>
              {t({
                en: "When on, the butcher cannot save unless the raw weight equals the products + waste exactly.",
                ar: "لما يكون مفعّل، الجزار ما بيقدر يحفظ إلا إذا وزن المادة الخام ساوى النواتج + الهدر تماماً.",
              })}
            </span>
          </div>
          <div style={{ ...S.chipRow, marginTop: 10 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 9, fontWeight: 800 }}>
              <Switch
                checked={bom.requirePieceCount === true}
                onChange={(v) => patch({ requirePieceCount: v })}
              />
              {t({ en: "Show a piece-count box (required)", ar: "إظهار خانة عدد القطع (إلزامية)" })}
            </label>
            <span style={S.hint}>
              {t({
                en: "When on, the butcher must enter the number of pieces before saving.",
                ar: "لما يكون مفعّل، الجزار لازم يدخّل عدد القطع قبل الحفظ.",
              })}
            </span>
          </div>

          {/* ── تجاوز قيد تطابق المدخل والمخرج (Same Item Override) ── */}
          <div style={{
            ...S.chipRow, marginTop: 12, padding: "12px 14px", borderRadius: 14,
            border: `1.5px solid ${allowSameIO ? "#a7d9d3" : "#e3edf7"}`,
            background: allowSameIO ? "#f0faf8" : "#fafcff",
          }}>
            <label style={{ display: "flex", alignItems: "flex-start", gap: 10, fontWeight: 800, minWidth: 0 }}>
              <Switch checked={allowSameIO} onChange={(v) => patch({ allowSameIO: v })} />
              <span style={{ minWidth: 0 }}>
                ♻️ {t({ en: "Allow same input/output product", ar: "السماح بتطابق المنتج المدخل والمخرج" })}
                <div style={{ ...S.hint, fontWeight: 700, marginTop: 4 }}>
                  {allowSameIO
                    ? t({
                        en: "On — the input item may also be an output (cleaning/trimming the same piece): once only, and its output weight must be less than the input.",
                        ar: "مفعّل — الصنف الداخل بيصير كمان مخرَج (تنظيف/تشذيب نفس القطعة): مرة وحدة بس، ووزن مخرجه لازم يكون أقل من المدخل.",
                      })
                    : t({
                        en: "Off — an output/waste can never be the same item as the input (the traditional rule).",
                        ar: "معطّل — ما بيصير المخرَج/الهدر يكون نفس صنف المدخل (القاعدة التقليدية).",
                      })}
                </div>
              </span>
            </label>
          </div>
        </fieldset>
      </Card>

      {multiPathways ? (
        /* ── وضع المسارات المتعددة: كل مسار له نواتجه وهدره وميزانه ── */
        <PathwayManager
          t={t} isAr={isAr} cfg={cfg} canEdit={canEdit} bom={bom} notify={notify}
          ops={pathwayOps}
        />
      ) : (
        <>
          {/* ── ميزان الكتلة ── */}
          <MassBalance t={t} math={math} uom={uom} />

          {/* ── النواتج ── */}
          <CutLines
            t={t} isAr={isAr} cfg={cfg} canEdit={canEdit}
            icon="🥩"
            title={t({ en: "Output products", ar: "المنتجات الناتجة" })}
            sub={t({
              en: "The cuts this input yields — picked from the item master.",
              ar: "القطع اللي بيعطيها الداخل — من سجل الأصناف.",
            })}
            addLabel={t({ en: "Add output", ar: "إضافة ناتج" })}
            lines={bom.outputs || []}
            inputQty={math.input}
            preferRoles={["finished", "component"]}
            accent="#047857"
            disabledFor={lineDisabledForList("outputs")}
            onBlocked={onLineBlocked}
            onAdd={() => addTo("outputs")}
            onPatch={(id, p) => patchList("outputs", id, p)}
            onDrop={(id) => dropFrom("outputs", id)}
          />

          {/* ── الهدر ── */}
          <CutLines
            t={t} isAr={isAr} cfg={cfg} canEdit={canEdit}
            icon="🦴"
            title={t({ en: "Waste / scrap", ar: "الهدر والمخلّفات" })}
            sub={t({
              en: "Bones, fat, trimmings… items whose role is “Waste” in the master list.",
              ar: "عظم، دهن، تشذيب… أصناف دورها «هدر» بسجل الأصناف.",
            })}
            addLabel={t({ en: "Add waste line", ar: "إضافة سطر هدر" })}
            lines={bom.wastes || []}
            inputQty={math.input}
            preferRoles={["waste"]}
            accent="#b45309"
            disabledFor={lineDisabledForList("wastes")}
            onBlocked={onLineBlocked}
            onAdd={() => addTo("wastes")}
            onPatch={(id, p) => patchList("wastes", id, p)}
            onDrop={(id) => dropFrom("wastes", id)}
          />
        </>
      )}
    </>
  );
}

/* ══════════════ مدير المسارات المتعددة ══════════════ */

function PathwayManager({ t, isAr, cfg, canEdit, bom, notify, ops }) {
  const pathways = bom.pathways || [];
  const input = itemById(cfg, bom.inputId);
  const uom = input?.uom || "";

  const [selId, setSel] = useState(pathways[0]?.id || "");
  const prevLen = useRef(pathways.length);

  // حافظ على اختيار صالح: اختر الجديد عند الإضافة، وارجع للأول لو انحذف المختار.
  useEffect(() => {
    if (pathways.length === 0) {
      if (selId) setSel("");
    } else if (pathways.length > prevLen.current) {
      setSel(pathways[pathways.length - 1].id);
    } else if (!pathways.some((p) => p.id === selId)) {
      setSel(pathways[0].id);
    }
    prevLen.current = pathways.length;
  }, [pathways, selId]);

  const sel = pathways.find((p) => p.id === selId) || null;
  const math = sel ? bomMath({ inputQty: bom.inputQty, outputs: sel.outputs, wastes: sel.wastes }) : null;

  // منع تكرار الصنف داخل نفس المسار (الداخل + الأصناف المضافة).
  const usedIds = useMemo(
    () => (sel ? [...(sel.outputs || []), ...(sel.wastes || [])].map((l) => l.itemId).filter(Boolean) : []),
    [sel]
  );

  // المخرجات المميِّزة لهويّة المسار: qty>0 وغير مشتركة (Any).
  const distinguishing = useMemo(() => {
    if (!sel) return [];
    return [...(sel.outputs || []), ...(sel.wastes || [])]
      .filter((l) => l.itemId && l.any !== true && num(l.qty) > 0)
      .map((l) => {
        const it = itemById(cfg, l.itemId);
        return it?.sku || nameOf(it, isAr) || l.itemId;
      });
  }, [sel, cfg, isAr]);
  const allowSameIO = bom.allowSameIO === true;   // مطابقة المدخل والمخرج
  const lineDisabledForList = (listKind) => (curItemId) => (i) => {
    if (i.id === bom.inputId) {
      if (allowSameIO && listKind === "outputs") {
        if (i.id !== curItemId && usedIds.includes(i.id)) return t({ en: "already added", ar: "مضاف مسبقاً" });
        return "";
      }
      return t({ en: "same as input", ar: "هو الداخل" });
    }
    if (i.id !== curItemId && usedIds.includes(i.id)) return t({ en: "already added", ar: "مضاف مسبقاً" });
    return "";
  };
  const onLineBlocked = (i, reason) => {
    const nm = nameOf(i, isAr) || i.sku || i.id;
    if (reason === t({ en: "same as input", ar: "هو الداخل" })) {
      notify?.(t({
        en: `Duplicate: "${nm}" is the input product — it can't also be an output or waste.`,
        ar: `مكرّر: «${nm}» هو المنتج الداخل — ما بيصير يكون ناتج أو هدر كمان.`,
      }), true);
    } else {
      notify?.(t({
        en: `Duplicate: "${nm}" is already added in this pathway.`,
        ar: `مكرّر: «${nm}» مضاف مسبقاً بهالمسار.`,
      }), true);
    }
  };

  const removePathway = (pw) => {
    if (!window.confirm(t({
      en: `Remove pathway ${pw.code || pw.name || ""}? (Applied when you Save the BOM.)`,
      ar: `حذف المسار ${pw.code || pw.name || ""}؟ (بيتطبّق وقت ما تحفظ القائمة.)`,
    }))) return;
    ops.drop(pw.id);
  };

  return (
    <>
      <Card
        icon="🔀"
        title={t({ en: "Routing pathways", ar: "مسارات التوزيع" })}
        sub={t({
          en: "Alternative ways this input can be broken down. Each pathway carries a unique code linked to the BOM.",
          ar: "طرق بديلة لتفكيك هذا الداخل. كل مسار بيحمل كود فريد مربوط بالقائمة.",
        })}
        right={
          canEdit && (
            <button type="button" style={{ ...S.btn, ...S.btnSm, ...S.btnPrimary }} onClick={ops.add}>
              ＋ {t({ en: "Add pathway", ar: "إضافة مسار" })}
            </button>
          )
        }
      >
        {pathways.length === 0 ? (
          <EmptyBox>
            {t({
              en: "No pathway yet — add one to define the first breakdown route.",
              ar: "لا مسار بعد — أضف واحداً لتعريف أول طريق تفكيك.",
            })}
          </EmptyBox>
        ) : (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {pathways.map((pw) => {
              const on = pw.id === selId;
              const off = pw.active === false;
              return (
                <button
                  key={pw.id}
                  type="button"
                  onClick={() => setSel(pw.id)}
                  style={{
                    ...S.btn, ...S.btnSm,
                    display: "flex", alignItems: "center", gap: 8,
                    ...(on ? { background: "#6d28d9", color: "#fff", border: "1.5px solid #6d28d9" } : null),
                    ...(off && !on ? { opacity: 0.6 } : null),
                  }}
                  title={off ? t({ en: "inactive pathway", ar: "مسار معطّل" }) : undefined}
                >
                  <b>{pw.code}</b>
                  {pw.name ? <span style={{ fontWeight: 700 }}>· {pw.name}</span> : null}
                  {off && <span>⏸</span>}
                </button>
              );
            })}
          </div>
        )}
      </Card>

      {sel && (
        <>
          <Card
            icon="🧭"
            title={
              <span style={{ display: "inline-flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <Badge color="#6d28d9" bg="#f3eefe">{sel.code}</Badge>
                {sel.name || t({ en: "Unnamed pathway", ar: "مسار بلا اسم" })}
                {sel.active === false && (
                  <Badge color="#b45309" bg="#fffbeb">{t({ en: "inactive", ar: "معطّل" })}</Badge>
                )}
              </span>
            }
            sub={t({
              en: "This pathway’s unique code is fixed and linked to the BOM reference.",
              ar: "كود هذا المسار الفريد ثابت ومربوط برقم القائمة.",
            })}
            right={
              canEdit && (
                <button
                  type="button"
                  style={{ ...S.btn, ...S.btnSm, ...S.btnDanger }}
                  onClick={() => removePathway(sel)}
                >
                  🗑 {t({ en: "Remove pathway", ar: "حذف المسار" })}
                </button>
              )
            }
          >
            <fieldset disabled={!canEdit} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
              <div style={S.grid}>
                <Field label={t({ en: "Pathway ID (auto)", ar: "كود المسار (تلقائي)" })}>
                  <input style={{ ...S.input, background: "#f7f5ff", fontWeight: 900, color: "#6d28d9" }}
                    value={sel.code} readOnly />
                </Field>
                <Field label={t({ en: "Pathway name", ar: "اسم المسار" })}>
                  <input
                    style={S.input}
                    value={sel.name ?? ""}
                    onChange={(e) => ops.patch(sel.id, { name: e.target.value })}
                    placeholder={t({ en: "e.g. Standard cut / Export cut", ar: "مثال: تقطيع عادي / تصدير" })}
                  />
                </Field>
                <Field label={t({ en: "Notes", ar: "ملاحظات" })}>
                  <input
                    style={S.input}
                    value={sel.notes ?? ""}
                    onChange={(e) => ops.patch(sel.id, { notes: e.target.value })}
                  />
                </Field>
              </div>
              <div style={{ ...S.chipRow, marginTop: 12 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 9, fontWeight: 800 }}>
                  <Switch checked={sel.active !== false} onChange={(v) => ops.patch(sel.id, { active: v })} />
                  {t({ en: "Active pathway", ar: "مسار مفعّل" })}
                </label>
              </div>

              {/* هويّة المسار — المخرجات المميِّزة اللي بتفرّقه عن باقي المسارات. */}
              <div style={{ ...S.note, marginTop: 12 }}>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  <b>🧬 {t({ en: "Pathway identity:", ar: "هوية المسار:" })}</b>
                  {distinguishing.length === 0 ? (
                    <span style={{ color: "#a12626", fontWeight: 800 }}>
                      {t({ en: "no distinguishing output yet", ar: "بلا مخرَج مميِّز بعد" })}
                    </span>
                  ) : (
                    distinguishing.map((s, i) => (
                      <Badge key={`${s}-${i}`} color="#6d28d9" bg="#f3eefe">{s}</Badge>
                    ))
                  )}
                </div>
                <div style={{ ...S.hint, marginTop: 6 }}>
                  {t({
                    en: "No two pathways may share the exact same set of distinguishing outputs. Mark shared items (white fat, natural waste, packaging…) as “Any” so they don’t affect the identity.",
                    ar: "ما بيصير مساران يتشاركوا نفس مجموعة المخرجات المميِّزة تماماً. علّم الأصناف المشتركة (دهن أبيض، هدر طبيعي، تغليف…) كـ«Any» حتى ما تأثّر على الهويّة.",
                  })}
                </div>
              </div>
            </fieldset>
          </Card>

          <MassBalance t={t} math={math} uom={uom} />

          <CutLines
            t={t} isAr={isAr} cfg={cfg} canEdit={canEdit}
            icon="🥩"
            title={t({ en: "Output products", ar: "المنتجات الناتجة" })}
            sub={t({
              en: "The cuts this pathway yields — picked from the item master.",
              ar: "القطع اللي بيعطيها هذا المسار — من سجل الأصناف.",
            })}
            addLabel={t({ en: "Add output", ar: "إضافة ناتج" })}
            lines={sel.outputs || []}
            inputQty={math.input}
            preferRoles={["finished", "component"]}
            accent="#047857"
            disabledFor={lineDisabledForList("outputs")}
            onBlocked={onLineBlocked}
            showAny
            onAdd={() => ops.addLine(sel.id, "outputs")}
            onPatch={(id, p) => ops.patchLine(sel.id, "outputs", id, p)}
            onDrop={(id) => ops.dropLine(sel.id, "outputs", id)}
          />

          <CutLines
            t={t} isAr={isAr} cfg={cfg} canEdit={canEdit}
            icon="🦴"
            title={t({ en: "Waste / scrap", ar: "الهدر والمخلّفات" })}
            sub={t({
              en: "Bones, fat, trimmings… items whose role is “Waste” in the master list.",
              ar: "عظم، دهن، تشذيب… أصناف دورها «هدر» بسجل الأصناف.",
            })}
            addLabel={t({ en: "Add waste line", ar: "إضافة سطر هدر" })}
            lines={sel.wastes || []}
            inputQty={math.input}
            preferRoles={["waste"]}
            accent="#b45309"
            disabledFor={lineDisabledForList("wastes")}
            onBlocked={onLineBlocked}
            showAny
            onAdd={() => ops.addLine(sel.id, "wastes")}
            onPatch={(id, p) => ops.patchLine(sel.id, "wastes", id, p)}
            onDrop={(id) => ops.dropLine(sel.id, "wastes", id)}
          />
        </>
      )}
    </>
  );
}

/* حقل نص بسيط بنمط الوحدة */
function TextInputLike({ value, onChange }) {
  return (
    <input style={S.input} value={value ?? ""} onChange={(e) => onChange(e.target.value)} />
  );
}

/* ══════════════ ميزان الكتلة ══════════════ */

function MassBalance({ t, math, uom }) {
  const { input, out, waste, loss, yieldPct, wastePct, over } = math;
  const pct = (v) => (input > 0 ? Math.max(0, Math.min(100, (v / input) * 100)) : 0);

  return (
    <Card
      icon="⚖️"
      title={t({ en: "Mass balance", ar: "ميزان الكتلة" })}
      sub={t({
        en: "Input = outputs + waste + unrecorded loss. Going over the input blocks saving.",
        ar: "الداخل = الناتج + الهدر + فاقد غير مسجّل. التجاوز عن الداخل بيمنع الحفظ.",
      })}
    >
      <div style={S.kpiRow}>
        <Kpi label={t({ en: "Input", ar: "الداخل" })} value={money(input, 2)} foot={uom} />
        <Kpi label={t({ en: "Outputs", ar: "الناتج" })} value={money(out, 2)}
          foot={`${yieldPct.toFixed(1)}% ${t({ en: "yield", ar: "عائد" })}`} color="#047857" />
        <Kpi label={t({ en: "Waste", ar: "الهدر" })} value={money(waste, 2)}
          foot={`${wastePct.toFixed(1)}%`} color="#b45309" />
        <Kpi
          label={over
            ? t({ en: "Over-allocated!", ar: "موزّع زيادة!" })
            : t({ en: "Unrecorded loss", ar: "فاقد غير مسجّل" })}
          value={money(Math.abs(loss), 2)}
          foot={input > 0 ? `${((Math.abs(loss) / input) * 100).toFixed(1)}%` : ""}
          color={over ? "#a12626" : "#6b8299"}
        />
      </div>

      {/* شريط التوزيع */}
      <div style={{
        display: "flex", height: 26, borderRadius: 999, overflow: "hidden",
        border: over ? "2px solid #a12626" : "1px solid #dbe6f2", background: "#f2f7fc",
      }}>
        <div style={{ width: `${pct(out)}%`, background: "#0f9d7a", transition: "width .25s ease" }}
          title={t({ en: "Outputs", ar: "الناتج" })} />
        <div style={{ width: `${pct(waste)}%`, background: "#e5a53f", transition: "width .25s ease" }}
          title={t({ en: "Waste", ar: "الهدر" })} />
      </div>
      <div style={{ ...S.hint, display: "flex", gap: 16, flexWrap: "wrap" }}>
        <span>🟩 {t({ en: "Outputs", ar: "الناتج" })}</span>
        <span>🟧 {t({ en: "Waste", ar: "الهدر" })}</span>
        <span>⬜ {t({ en: "Unrecorded loss", ar: "فاقد غير مسجّل" })}</span>
        {over && (
          <b style={{ color: "#a12626" }}>
            ⚠️ {t({ en: "Total exceeds the input quantity.", ar: "المجموع أكثر من كمية الداخل." })}
          </b>
        )}
      </div>
    </Card>
  );
}

/* ══════════════ أسطر (نواتج / هدر) ══════════════ */

function CutLines({
  t, isAr, cfg, canEdit, icon, title, sub, addLabel, lines, inputQty,
  preferRoles, accent, onAdd, onPatch, onDrop, disabledFor, onBlocked, showAny,
}) {
  const roleNames = preferRoles
    .map((r) => nameOf(ITEM_TYPES.find((x) => x.id === r) || {}, isAr))
    .filter(Boolean)
    .join(" / ");

  return (
    <Card
      icon={icon}
      title={title}
      sub={sub}
      right={
        canEdit && (
          <button type="button" style={{ ...S.btn, ...S.btnSm, ...S.btnPrimary }} onClick={onAdd}>
            ＋ {addLabel}
          </button>
        )
      }
    >
      {lines.length === 0 ? (
        <EmptyBox>
          {t({ en: "No lines yet — add one from the item master.", ar: "لا أسطر بعد — ضيف من سجل الأصناف." })}
          <div style={{ ...S.hint, marginTop: 6 }}>
            {t({ en: "Suggested role", ar: "الدور المقترح" })}: {roleNames}
          </div>
        </EmptyBox>
      ) : (
        <div style={S.tableWrap}>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={{ ...S.th, width: 46 }}>#</th>
                <th style={S.th}>{t({ en: "Code", ar: "الكود" })}</th>
                <th style={{ ...S.th, minWidth: 280 }}>{t({ en: "Item (from master)", ar: "الصنف (من السجل)" })}</th>
                <th style={S.th}>{t({ en: "Qty", ar: "الكمية" })}</th>
                <th style={S.th}>{t({ en: "UoM", ar: "الوحدة" })}</th>
                <th style={S.th}>{t({ en: "% of input", ar: "٪ من الداخل" })}</th>
                {showAny && (
                  <th style={S.th} title={t({
                    en: "Shared item — ignored when identifying the pathway",
                    ar: "صنف مشترك — يُتجاهل عند تحديد هوية المسار",
                  })}>
                    {t({ en: "Shared (Any)", ar: "مشترك (Any)" })}
                  </th>
                )}
                <th style={S.th}></th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l, idx) => {
                const it = itemById(cfg, l.itemId);
                const share = inputQty > 0 ? (num(l.qty) / inputQty) * 100 : 0;
                return (
                  <tr key={l.id}>
                    <td style={{ ...S.td, fontWeight: 900, color: "#8aa3b8" }}>{idx + 1}</td>
                    <td style={{ ...S.td, fontWeight: 900, color: "#14507f", whiteSpace: "nowrap" }}>
                      {it?.sku || (l.itemId ? "—" : "")}
                    </td>
                    <td style={{ ...S.td, ...S.tdStart, minWidth: 280 }}>
                      {canEdit ? (
                        <ItemPicker
                          cfg={cfg}
                          value={l.itemId}
                          onPick={(id) => onPatch(l.id, { itemId: id })}
                          isAr={isAr}
                          t={t}
                          prefer={preferRoles}
                          disabledFor={disabledFor ? disabledFor(l.itemId) : undefined}
                          onBlocked={onBlocked}
                        />
                      ) : (
                        <span style={{ fontWeight: 800 }}>{nameOf(it, isAr) || "—"}</span>
                      )}
                    </td>
                    <td style={S.td}>
                      <NumInput
                        style={S.inputSm}
                        disabled={!canEdit}
                        value={l.qty}
                        onChange={(v) => onPatch(l.id, { qty: v })}
                      />
                    </td>
                    <td style={S.td}>{it?.uom || "—"}</td>
                    <td style={{ ...S.td, fontWeight: 900, color: accent }}>
                      {l.any === true
                        ? <span style={{ color: "#8aa3b8" }}>—</span>
                        : inputQty > 0 && num(l.qty) > 0 ? `${share.toFixed(1)}%` : "—"}
                    </td>
                    {showAny && (
                      <td style={S.td}>
                        <div style={{ display: "flex", justifyContent: "center" }}>
                          <Switch
                            checked={l.any === true}
                            disabled={!canEdit}
                            onChange={(v) => onPatch(l.id, { any: v })}
                          />
                        </div>
                      </td>
                    )}
                    <td style={S.td}>
                      {canEdit && (
                        <button type="button" style={{ ...S.btn, ...S.btnSm, ...S.btnDanger }}
                          onClick={() => onDrop(l.id)}>
                          ✕
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
