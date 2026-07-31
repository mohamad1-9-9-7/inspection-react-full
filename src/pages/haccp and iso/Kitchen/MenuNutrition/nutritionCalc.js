// src/pages/haccp and iso/Kitchen/MenuNutrition/nutritionCalc.js
// Portion scaling, rounding, Atwater cross-check and compliance status
// for the Abu Dhabi menu labelling regulation (ADG 10/2026).

import { totalWeightOf } from "./menuData";

/**
 * The mandatory nutrient list, in the order the regulation lists them.
 * `digits` follows the rounding rule: whole numbers for calories and sodium,
 * one decimal for everything else.
 */
export const NUTRIENTS = [
  { key: "calories", unit: "kcal", digits: 0, en: "Calories", ar: "السعرات الحرارية" },
  { key: "totalFat", unit: "g", digits: 1, en: "Total Fat", ar: "إجمالي الدهون" },
  { key: "saturatedFat", unit: "g", digits: 1, en: "Saturated Fat", ar: "الدهون المشبعة" },
  { key: "transFat", unit: "g", digits: 1, en: "Trans Fat", ar: "الدهون المتحولة" },
  { key: "sodium", unit: "mg", digits: 0, en: "Sodium", ar: "الصوديوم" },
  { key: "cholesterol", unit: "mg", digits: 1, en: "Cholesterol", ar: "الكوليسترول" },
  { key: "dietaryFiber", unit: "g", digits: 1, en: "Dietary Fiber", ar: "الألياف الغذائية" },
  { key: "totalCarbs", unit: "g", digits: 1, en: "Total Carbohydrates", ar: "إجمالي الكربوهيدرات" },
  { key: "totalSugars", unit: "g", digits: 1, en: "Total Sugars", ar: "إجمالي السكريات" },
  { key: "protein", unit: "g", digits: 1, en: "Total Protein", ar: "إجمالي البروتين" },
];

export const NUTRIENT_KEYS = NUTRIENTS.map((n) => n.key);

/** Mandatory daily-intake reference statement — must be displayed verbatim. */
export const DAILY_INTAKE_EN =
  "Adults and youth (13+) need an average of 2,000 kcal/day, while children (4–12) need an average of 1,500 kcal/day, though individual requirements vary.";

// ⚠️ Unofficial translation. Replace with the exact Arabic wording published in
// ADG 10/2026 before going live — the statement must appear verbatim.
export const DAILY_INTAKE_AR =
  "يحتاج البالغون والشباب (13 سنة وأكثر) إلى 2000 كيلو كالوري يومياً في المتوسط، بينما يحتاج الأطفال (4–12 سنة) إلى 1500 كيلو كالوري يومياً في المتوسط، إلا أن الاحتياجات تختلف من شخص لآخر.";

/** Atwater energy factors, kcal per gram. */
export const ATWATER = { carbs: 4, protein: 4, fat: 9, fiber: 2, alcohol: 7 };

/** Deviation above which the entered calories are flagged. */
export const ATWATER_TOLERANCE_PCT = 10;

export function roundTo(value, digits) {
  if (!Number.isFinite(value)) return null;
  const f = 10 ** digits;
  return Math.round(value * f) / f;
}

/** Coerce a form field to a finite number, or null when blank/invalid. */
export function num(v) {
  if (v === "" || v === null || v === undefined) return null;
  const n = Number(String(v).replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660)));
  return Number.isFinite(n) ? n : null;
}

/**
 * Scale per-100g values to one portion.
 * @returns {Object} key → rounded portion value (null when the input is missing)
 */
export function computePortion(per100, totalWeightG) {
  const out = {};
  const w = num(totalWeightG);
  for (const n of NUTRIENTS) {
    const v = num(per100?.[n.key]);
    out[n.key] = v === null || w === null ? null : roundTo((v * w) / 100, n.digits);
  }
  return out;
}

/**
 * Atwater cross-check on the per-100g values.
 *
 * Fiber is priced at 2 kcal/g and removed from the carbohydrate term, so it is
 * not counted twice (the entered `totalCarbs` includes fiber).
 *
 * @returns {{ status: "ok"|"warn"|"na", calc: number|null,
 *             entered: number|null, deviationPct: number|null }}
 */
export function atwaterCheck(per100) {
  const carbs = num(per100?.totalCarbs);
  const protein = num(per100?.protein);
  const fat = num(per100?.totalFat);
  const fiber = num(per100?.dietaryFiber) ?? 0;
  const alcohol = num(per100?.alcohol) ?? 0;
  const entered = num(per100?.calories);

  if (carbs === null || protein === null || fat === null) {
    return { status: "na", calc: null, entered, deviationPct: null };
  }

  const availableCarbs = Math.max(0, carbs - fiber);
  const calc = roundTo(
    availableCarbs * ATWATER.carbs +
      protein * ATWATER.protein +
      fat * ATWATER.fat +
      fiber * ATWATER.fiber +
      alcohol * ATWATER.alcohol,
    0
  );

  if (entered === null || calc === null || calc === 0) {
    return { status: "na", calc, entered, deviationPct: null };
  }

  const deviationPct = roundTo((Math.abs(entered - calc) / calc) * 100, 1);
  return {
    status: deviationPct > ATWATER_TOLERANCE_PCT ? "warn" : "ok",
    calc,
    entered,
    deviationPct,
  };
}

/* ───────── consistency validation ───────── */

/**
 * Physical / compositional limits. These catch data-entry mistakes that the
 * Atwater check only sees indirectly (it flags the calorie total, not the
 * nutrient that is actually impossible).
 */
export const LIMITS = {
  /** Pure fat is ~900 kcal/100 g — nothing edible can exceed that. */
  maxKcalPer100: 900,
  /** Pure salt is ~39,300 mg sodium/100 g. */
  maxSodiumPer100: 40000,
  /** Fat + carbs + protein cannot exceed the 100 g they are measured in. */
  maxMacroGrams: 100,
  /** Rounding slack (g) before a subset rule is treated as violated. */
  tolerance: 0.1,
};

/**
 * Check the per-100g values against composition rules.
 *
 * @returns {{ errors: Object<string, string[]>, list: Array<{code:string, vars:Object}> }}
 *          `errors` maps a nutrient key to the codes that flag it (for field
 *          highlighting); `list` is the human-readable set of problems.
 */
export function validateNutrients(per100) {
  const errors = {};
  const list = [];
  const v = {};
  for (const n of NUTRIENTS) v[n.key] = num(per100?.[n.key]);

  const flag = (keys, code, vars) => {
    for (const k of keys) {
      if (!errors[k]) errors[k] = [];
      if (!errors[k].includes(code)) errors[k].push(code);
    }
    list.push({ code, vars: vars || {} });
  };

  // Negative values
  const negatives = NUTRIENTS.filter((n) => v[n.key] !== null && v[n.key] < 0).map((n) => n.key);
  if (negatives.length) flag(negatives, "vNegative", {});

  // Calorie ceiling
  if (v.calories !== null && v.calories > LIMITS.maxKcalPer100) {
    flag(["calories"], "vKcalMax", { max: LIMITS.maxKcalPer100, v: v.calories });
  }

  // Sodium ceiling
  if (v.sodium !== null && v.sodium > LIMITS.maxSodiumPer100) {
    flag(["sodium"], "vSodiumMax", { max: LIMITS.maxSodiumPer100, v: v.sodium });
  }

  // Saturated + trans are both part of total fat
  if (v.totalFat !== null && (v.saturatedFat !== null || v.transFat !== null)) {
    const sum = roundTo((v.saturatedFat ?? 0) + (v.transFat ?? 0), 2);
    if (sum > v.totalFat + LIMITS.tolerance) {
      flag(["totalFat", "saturatedFat", "transFat"], "vFatSubset", { sum, total: v.totalFat });
    }
  }

  // Fiber and sugars are both part of total carbohydrates
  if (v.totalCarbs !== null) {
    const fiberOver = v.dietaryFiber !== null && v.dietaryFiber > v.totalCarbs + LIMITS.tolerance;
    const sugarOver = v.totalSugars !== null && v.totalSugars > v.totalCarbs + LIMITS.tolerance;

    if (fiberOver) {
      flag(["totalCarbs", "dietaryFiber"], "vFiberSubset", {
        v: v.dietaryFiber,
        total: v.totalCarbs,
      });
    }
    if (sugarOver) {
      flag(["totalCarbs", "totalSugars"], "vSugarSubset", {
        v: v.totalSugars,
        total: v.totalCarbs,
      });
    }
    // Only worth reporting the combined rule when neither part broke it alone.
    if (!fiberOver && !sugarOver && v.dietaryFiber !== null && v.totalSugars !== null) {
      const sum = roundTo(v.dietaryFiber + v.totalSugars, 2);
      if (sum > v.totalCarbs + LIMITS.tolerance) {
        flag(["totalCarbs", "dietaryFiber", "totalSugars"], "vCarbSubset", {
          sum,
          total: v.totalCarbs,
        });
      }
    }
  }

  // Macronutrients must fit inside 100 g
  if (v.totalFat !== null && v.totalCarbs !== null && v.protein !== null) {
    const sum = roundTo(v.totalFat + v.totalCarbs + v.protein, 2);
    if (sum > LIMITS.maxMacroGrams) {
      flag(["totalFat", "totalCarbs", "protein"], "vMacroSum", { sum });
    }
  }

  return { errors, list };
}

/** True when every mandatory nutrient has a value. */
export function hasAllNutrients(per100) {
  return NUTRIENT_KEYS.every((k) => num(per100?.[k]) !== null);
}

/** True when the documentation required for inspection is present. */
export function hasDocumentation(doc) {
  return !!(doc?.method && String(doc?.source || "").trim() && doc?.date);
}

/**
 * Compliance status of one item.
 * @returns {{ status: "complete"|"partial"|"empty",
 *             needsRecalc: boolean, recalcReason: string|null,
 *             filled: number, missingWeight: boolean, weight: number|null,
 *             invalid: boolean, validation: ReturnType<typeof validateNutrients> }}
 */
export function itemStatus(item) {
  const per100 = item?.per100 || {};
  const doc = item?.doc || {};
  const filled = NUTRIENT_KEYS.filter((k) => num(per100[k]) !== null).length;
  const weight = totalWeightOf(item);
  const missingWeight = weight === null;

  const validation = validateNutrients(per100);
  const invalid = validation.list.length > 0;

  let status = "empty";
  if (filled > 0) status = "partial";
  if (filled === NUTRIENT_KEYS.length && hasDocumentation(doc) && !missingWeight && !invalid) {
    status = "complete";
  }

  // The regulation requires recalculation whenever the recipe, the ingredients
  // or the portion weight change — so compare against what was in place when
  // the values were last calculated.
  let needsRecalc = false;
  let recalcReason = null;
  if (filled > 0) {
    const currentIngredients = `${item?.ingredients || ""}|${item?.ingredientsAr || ""}`.trim();
    if (!doc.date) {
      needsRecalc = true;
      recalcReason = "noDate";
    } else if (
      item?.weightAtCalc !== null &&
      item?.weightAtCalc !== undefined &&
      weight !== null &&
      Number(item.weightAtCalc) !== Number(weight)
    ) {
      needsRecalc = true;
      recalcReason = "weight";
    } else if (
      item?.ingredientsAtCalc !== null &&
      item?.ingredientsAtCalc !== undefined &&
      currentIngredients !== String(item.ingredientsAtCalc).trim()
    ) {
      needsRecalc = true;
      recalcReason = "ingredients";
    }
  }

  return { status, needsRecalc, recalcReason, filled, missingWeight, weight, invalid, validation };
}

/** Human-readable reason an item needs recalculating. */
export function recalcMessage(t, item, status) {
  switch (status?.recalcReason) {
    case "weight":
      return t("recalcReasonWeight", { old: item?.weightAtCalc, now: status.weight });
    case "ingredients":
      return t("recalcReasonIngredients");
    case "noDate":
      return t("recalcReasonNoDate");
    default:
      return "";
  }
}

/** Format a portion value for display, with its unit. */
export function fmt(value, digits, unit) {
  if (value === null || value === undefined) return "—";
  const s = digits === 0 ? String(Math.round(value)) : value.toFixed(digits);
  return unit ? `${s} ${unit}` : s;
}
