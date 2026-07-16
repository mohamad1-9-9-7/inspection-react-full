// src/pages/monitor/branches/_shared/traceabilityRecipes.js
//
// خريطة "المادة الخام → المنتجات النهائية" لتقارير التتبع.
// مبنية على تحليل السجلات القديمة الفعلية (POS 10/11/15/19 + Production)
// مرتّبة بالأكثر استخداماً أولاً، ومنقّحة يدوياً بمنطق الجزّار.
//
// الاستخدام:
//   import { suggestRecipe, ALL_FINALS } from "..._shared/traceabilityRecipes";
//   const recipe = suggestRecipe("AUS CHILLED LAMB CARCASS"); // => {label, finals:[...]}
//
// كل فئة: { id, label, finals[] }. يتم مطابقة اسم المادة الخام عبر classifyRaw().

export const RAW_RECIPES = [
  {
    id: "lamb_carcass",
    label: "Lamb Carcass / ذبيحة خروف",
    // القطع الاحترافية للخروف — الفخذ/الظهر/الكتف/الرقبة لكل منها بالعظم وبدون عظم
    finals: [
      "Lamb Leg Bone-in / فخذ خروف بالعظم",
      "Lamb Leg Boneless / فخذ خروف بدون عظم",
      "Lamb Loin (Back) Bone-in / ظهر خروف بالعظم",
      "Lamb Loin (Back) Boneless / ظهر خروف بدون عظم",
      "Lamb Shoulder Bone-in / كتف خروف بالعظم",
      "Lamb Shoulder Boneless / كتف خروف بدون عظم",
      "Lamb Neck Bone-in / رقبة خروف بالعظم",
      "Lamb Neck Boneless / رقبة خروف بدون عظم",
      "Lamb Shank / موزة خروف",
      "Lamb Flap / فلاب خروف",
      "Lamb Rib Cage / قفص خروف",
      "Lamb Rack Special Cut / رَك خروف (قطعة خاصة)",
    ],
  },
  {
    id: "hogget_carcass",
    label: "Hogget Carcass / ذبيحة حَقّ (خروف كبير)",
    finals: [
      "Leg", "Rack", "Shoulder", "Shortloin", "Neck",
      "Breast & Flab B/In", "Minced", "Sujouk", "Beef Merguez",
      "Lamb Merguez", "Nakanak",
    ],
  },
  {
    id: "veal_bonein",
    label: "Veal / عجل",
    // الأكثر استخداماً أولاً (بدون عظم/مفروم/برغر/كفتة)، ثم قطع الفخذ ثم الكتف ثم باقي القطع
    finals: [
      "Veal Boneless / لحم عجل بدون عظم",
      "Veal Minced / لحم عجل مفروم",
      "Veal Burger / برغر عجل",
      "Veal Kufta / كفتة عجل",
      "Veal Cubes Boneless / مكعبات عجل بدون عظم",
      "Veal Minced Low Fat / لحم عجل مفروم قليل الدهن",
      // الفخذ / Leg
      "Veal Leg Bone-in / فخذ عجل بالعظم",
      "Veal Leg Boneless / فخذ عجل بدون عظم",
      "Veal Topside / تُبسايد عجل (الفخذ الطري)",
      "Veal Silverside / سيلفر سايد عجل",
      "Veal Knuckle / كنَكل عجل",
      "Veal Rump / رَمب عجل",
      "Veal Escalope / اسكالوب عجل",
      "Veal Schnitzel / شنيتزل عجل",
      "Veal Shank / موزة عجل",
      // الكتف / Shoulder
      "Veal Shoulder Bone-in / كتف عجل بالعظم",
      "Veal Shoulder Boneless / كتف عجل بدون عظم",
      "Veal Shoulder Cubes / مكعبات كتف عجل",
      // قطع أخرى / Other
      "Veal Chops / ريش عجل",
      "Veal Tenderloin / فيليه عجل",
      "Veal Striploin / ستريبلوين عجل",
      "Veal Thin Steak / ستيك عجل رفيع",
    ],
  },
  {
    id: "vacuum",
    label: "Vacuum (Boneless Veal) / فاكيوم (لحم عجل مفرّغ)",
    // الفاكيوم = لحم عجل بدون عظم مفرّغ الهواء → منتجات العجل بدون عظم فقط (بلا قطع عظمية)
    finals: [
      "Veal Boneless / لحم عجل بدون عظم",
      "Veal Minced / لحم عجل مفروم",
      "Veal Cubes Boneless / مكعبات عجل بدون عظم",
      "Veal Kufta / كفتة عجل",
      "Veal Burger / برغر عجل",
      "Veal Minced Low Fat / لحم عجل مفروم قليل الدهن",
      "Veal Escalope / اسكالوب عجل",
      "Veal Schnitzel / شنيتزل عجل",
      "Veal Thin Steak / ستيك عجل رفيع",
      "Veal Striploin / ستريبلوين عجل",
      "Veal Tenderloin / فيليه عجل",
    ],
  },
  {
    id: "chicken_breast",
    label: "Chicken Breast / صدر دجاج",
    finals: [
      "Red Shish Tawook", "White Shish Tawook", "Chicken Kabab",
      "Honey Shish Tawook", "Chicken Steak with Mushrooms",
      "Chicken Marinated", "Butter Chicken", "Chicken Shawarma",
      "Chicken Stroganoff", "Chicken Escalope",
    ],
  },
  {
    id: "beef_topside",
    label: "Beef Topside (Brazilian) / تُبسايد بقر برازيلي",
    finals: [
      "Brazilian Beef Cubes B/L / مكعبات بقر بدون عظم",
      "Brazilian Beef Minced / لحم بقر مفروم",
      "Brazilian Beef Burger / برغر بقر",
      "Brazilian Beef Kufta / كفتة بقر",
      "Brazilian Beef Thin Steak / ستيك بقر رفيع",
      "Brazilian Beef Shawarma / شاورما بقر",
      "Brazilian Beef Stroganoff / سترغانوف بقر",
      "Brazilian Beef Escalope / اسكالوب بقر",
      "Brazilian Beef Steak / Roast / ستيك أو روست بقر",
      "Brazilian Beef Minced Low Fat / لحم بقر مفروم قليل الدهن",
    ],
  },
  {
    id: "beef_tenderloin",
    label: "Beef Tenderloin (Brazilian) / فيليه بقر برازيلي",
    finals: [
      "Brazilian Beef Tenderloin Whole / فيليه بقر كامل",
      "Brazilian Beef Tenderloin Steak / ستيك فيليه بقر",
      "Brazilian Beef Tenderloin Medallions / ميداليون فيليه بقر",
      "Brazilian Beef Tenderloin Cubes / مكعبات فيليه بقر",
      "Brazilian Beef Minced / لحم بقر مفروم",
    ],
  },
  {
    id: "beef_wagyu",
    label: "Aus Wagyu Beef / واغيو",
    finals: [
      "Aus Wagyu Thin Steak / ستيك واغيو رفيع",
      "Aus Wagyu Steak / Roast / ستيك أو روست واغيو",
      "Aus Wagyu Burger / برغر واغيو",
      "Aus Wagyu Minced / واغيو مفروم",
      "Aus Wagyu Cubes B/L / مكعبات واغيو بدون عظم",
      "Aus Wagyu Shawarma / شاورما واغيو",
    ],
  },
  {
    id: "beef_angus",
    label: "Aus Angus Beef / أنجوس",
    finals: [
      "Aus Angus Beef Burger / برغر أنجوس",
      "Aus Angus Beef Minced / أنجوس مفروم",
      "Aus Angus Beef Cubes B/L / مكعبات أنجوس بدون عظم",
      "Aus Angus Beef Thin Steak / ستيك أنجوس رفيع",
      "Aus Angus Beef Steak / Roast / ستيك أو روست أنجوس",
      "Aus Angus Beef Knuckle / كنَكل أنجوس",
      "Aus Angus Beef Shawarma / شاورما أنجوس",
    ],
  },
  {
    id: "camel",
    label: "Camel / جمل",
    finals: [
      "Fresh Camel Cubes B/L", "Fresh Camel B/L", "Fresh Camel Kufta",
      "Camel Burger", "Fresh Camel Senam", "Fresh Camel Cubes B/In",
      "Fresh Camel Senam Fat",
    ],
  },
  {
    id: "rice",
    label: "Sella Basmati Rice / رز بسمتي",
    finals: [
      "Vermicelli Rice", "Biryani Rice", "White Rice", "Kabssa Rice",
      "Bukhari Rice", "Maklouba Rice (Green Broad Beans)", "Ouzi Rice",
      "Mashbous Rice",
    ],
  },
  {
    id: "lamb_boneless_cooked",
    label: "Lamb Boneless / أطباق مطبوخة",
    finals: [
      "Dawood Basha", "Kofta with Tomato Sauce", "Kofta with Tahina",
      "Kofta with Eggplant", "Stuffed Marrow with Meat",
      "Cut Beans with Lamb", "Green Peas with Lamb", "Okra with Lamb",
      "Lamb Shakriya", "Boiled Meat Boneless",
    ],
  },
];

const byId = Object.fromEntries(RAW_RECIPES.map((r) => [r.id, r]));

/* تصنيف اسم المادة الخام إلى فئة (نفس ترتيب الأولوية المستخدم في تحليل البيانات) */
export function classifyRaw(name) {
  const s = String(name || "").toLowerCase();
  if (!s.trim()) return null;
  const has = (...ks) => ks.some((k) => s.includes(k));
  if (has("chicken")) return "chicken_breast";
  if (has("camel")) return "camel";
  if (has("wagyu")) return "beef_wagyu";
  if (has("angus") || has("knuckle")) return "beef_angus";
  if (has("beef") && has("tenderloin")) return "beef_tenderloin";
  if (has("brazil") || (has("beef") && has("topside"))) return "beef_topside";
  if (has("beef")) return "beef_topside"; // أي بقر عام → تُبسايد افتراضياً (يمكن تغيير الصنف يدوياً)
  if (has("vacuum", "vaccum", "vacume", "فاكيوم", "مفرغ", "مفرّغ")) return "vacuum";
  if (has("veal")) return "veal_bonein";
  if (has("rice") || has("basmati") || has("sella")) return "rice";
  if (has("lamb") && has("boneless")) return "lamb_boneless_cooked";
  if (s.includes("leg boneless") || s.includes("boneless leg")) return "lamb_boneless_cooked";
  if (has("hogget")) return "hogget_carcass";
  if (has("lamb") || has("carcass") || s === "uas" || s.includes("aus carcass")) return "lamb_carcass";
  return null;
}

/* إرجاع فئة المنتجات المقترحة لاسم مادة خام (أو null) */
export function suggestRecipe(rawName) {
  const id = classifyRaw(rawName);
  return id ? byId[id] : null;
}

/* قائمة موحّدة بكل المنتجات النهائية (للبحث الاحتياطي في النافذة) */
export const ALL_FINALS = Array.from(
  new Set(RAW_RECIPES.flatMap((r) => r.finals))
).sort((a, b) => a.localeCompare(b));
