// src/pages/sweets-training/content/modules.js
// The confectionery company's training modules. A module is keyed by its
// English NAME everywhere (sessions, question banks, references, plan) —
// renaming one orphans its saved sessions, so add new names, don't rename.
//
// Limits taught here are the SAME as the sweets daily forms
// (branches/sweets/dailyLogSchemas.js + sweetsReportGuides.js). Change a limit
// there → change it here too.

export const SWEETS_MODULES = [
  "Personal Hygiene & Handwashing",
  "Allergen Control",
  "High-Risk Fillings: Cream, Custard & Cheese",
  "Baking, Cooking & Sugar Syrups",
  "Cooling, Chilled Storage & Display",
  "Thawing (Defrosting)",
  "Receiving & Dry Store",
  "Cleaning & Sanitation",
  "Foreign Body & Cross-Contamination",
  "Pest Control Awareness",
  "Labelling, Shelf Life & Traceability",
  "HACCP Basics for Confectionery",
  "OHS: Ovens, Burns & Hot Sugar",
];

export const SWEETS_MODULES_AR = {
  "Personal Hygiene & Handwashing": "النظافة الشخصية وغسل اليدين",
  "Allergen Control": "التحكم في مسببات الحساسية",
  "High-Risk Fillings: Cream, Custard & Cheese": "الحشوات عالية الخطورة: الكريمة والكاسترد والجبن",
  "Baking, Cooking & Sugar Syrups": "الخَبز والطبخ والقطر السكري",
  "Cooling, Chilled Storage & Display": "التبريد والحفظ المبرّد والعرض",
  "Thawing (Defrosting)": "إذابة التجميد",
  "Receiving & Dry Store": "الاستلام ومخزن المواد الجافة",
  "Cleaning & Sanitation": "التنظيف والتعقيم",
  "Foreign Body & Cross-Contamination": "الأجسام الغريبة والتلوث التبادلي",
  "Pest Control Awareness": "التوعية بمكافحة الآفات",
  "Labelling, Shelf Life & Traceability": "البطاقة الغذائية ومدة الصلاحية والتتبع",
  "HACCP Basics for Confectionery": "أساسيات الهاسب للحلويات",
  "OHS: Ovens, Burns & Hot Sugar": "السلامة المهنية: الأفران والحروق والسكر الساخن",
};

export const SWEETS_MODULES_AR_SHORT = {
  "Personal Hygiene & Handwashing": "النظافة الشخصية",
  "Allergen Control": "الحساسية",
  "High-Risk Fillings: Cream, Custard & Cheese": "الحشوات عالية الخطورة",
  "Baking, Cooking & Sugar Syrups": "الخَبز والطبخ",
  "Cooling, Chilled Storage & Display": "التبريد والعرض",
  "Thawing (Defrosting)": "إذابة التجميد",
  "Receiving & Dry Store": "الاستلام والتخزين",
  "Cleaning & Sanitation": "التنظيف والتعقيم",
  "Foreign Body & Cross-Contamination": "الأجسام الغريبة",
  "Pest Control Awareness": "مكافحة الآفات",
  "Labelling, Shelf Life & Traceability": "البطاقة والتتبع",
  "HACCP Basics for Confectionery": "أساسيات الهاسب",
  "OHS: Ovens, Burns & Hot Sugar": "السلامة المهنية",
};

/** Column header in the gap analysis (English). */
export const SWEETS_MODULES_SHORT_EN = {
  "Personal Hygiene & Handwashing": "Hygiene",
  "Allergen Control": "Allergens",
  "High-Risk Fillings: Cream, Custard & Cheese": "Fillings",
  "Baking, Cooking & Sugar Syrups": "Baking",
  "Cooling, Chilled Storage & Display": "Cooling",
  "Thawing (Defrosting)": "Thawing",
  "Receiving & Dry Store": "Receiving",
  "Cleaning & Sanitation": "Cleaning",
  "Foreign Body & Cross-Contamination": "Foreign Body",
  "Pest Control Awareness": "Pests",
  "Labelling, Shelf Life & Traceability": "Labelling",
  "HACCP Basics for Confectionery": "HACCP",
  "OHS: Ovens, Burns & Hot Sugar": "OHS Burns",
};

/** Default annual plan — month → modules. Hygiene opens and closes the year;
 *  summer (Jun–Aug) carries the cold-chain modules, when ambient heat makes
 *  cream and display failures most likely. */
export const SWEETS_MONTHLY_FOCUS = {
  1: ["Personal Hygiene & Handwashing", "OHS: Ovens, Burns & Hot Sugar"],
  2: ["Cleaning & Sanitation"],
  3: ["Receiving & Dry Store", "Pest Control Awareness"],
  4: ["Allergen Control"],
  5: ["HACCP Basics for Confectionery"],
  6: ["High-Risk Fillings: Cream, Custard & Cheese"],
  7: ["Cooling, Chilled Storage & Display", "Thawing (Defrosting)"],
  8: ["Baking, Cooking & Sugar Syrups"],
  9: ["Foreign Body & Cross-Contamination"],
  10: ["Labelling, Shelf Life & Traceability"],
  11: ["Allergen Control", "Cleaning & Sanitation"],
  12: ["Personal Hygiene & Handwashing", "HACCP Basics for Confectionery"],
};
