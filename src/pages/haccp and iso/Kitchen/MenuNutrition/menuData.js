// src/pages/haccp and iso/Kitchen/MenuNutrition/menuData.js
// Menu catalogue model + weight parsing for the Bbayti (بيتي) menu labelling module.
//
// The catalogue itself lives on the server (one report per item, type
// kitchen_menu_nutrition_item). SEED_ITEMS below is only a starter list used by
// the "Load starter catalogue" button — every field stays editable in the UI.

export const SECTIONS = [
  { id: "day", labelKey: "secDay", icon: "📅" },
  { id: "salads", labelKey: "secSalads", icon: "🥗" },
  { id: "cold", labelKey: "secCold", icon: "🥣" },
  { id: "hot", labelKey: "secHot", icon: "🍲" },
];

export const DAYS = [
  "Saturday",
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
];

/**
 * Arabic for the "served with" accompaniments. Kept as a lookup so the same
 * English phrase always renders the same Arabic — edit here, not per row.
 * (Translations to verify with the kitchen; every value stays editable in the UI.)
 */
const SERVED_AR = {
  "chutneys  & laban cucumber": "صلصات وخيار باللبن",
  "vermicelli rice": "أرز بالشعيرية",
  "with potato Wedges & wite rice  rice": "مع بطاطا ودجز وأرز أبيض",
  "with potato Wedges & white rice": "مع بطاطا ودجز وأرز أبيض",
  "with white rice": "مع أرز أبيض",
  "Vegetables plate": "طبق خضار",
  "Toasted croutons bread": "خبز محمّص (كروتون)",
  "Grenadine molasses": "دبس الرمان",
  "tahina sauce": "صلصة الطحينة",
  "tahina sauce , pickles , bread": "صلصة الطحينة، مخللات، خبز",
};

/**
 * ── THE MASTER MENU TABLE ──
 * Transcribed from the kitchen's own worksheet, one row per served item.
 * Columns: [section, day, nameEn, nameAr, servedWith, weightRaw]
 *
 * To add a dish: append a row here (or add it straight from the entry screen —
 * the server-side catalogue is the live database; this table is only the seed).
 *
 * `weightRaw` is the TOTAL portion weight in grams as recorded by the kitchen,
 * except the two piece-based plates, which are written as `pieces x grams`.
 */
export const MENU_ROWS = [
  // ── Saturday ──
  ["day", "Saturday", "Lamb Ouzi", "خروف محشي", "chutneys  & laban cucumber", "700"],
  ["day", "Saturday", "Kofta with Tomato sauce", "كفتة بصلصة الطماطم", "vermicelli rice", "650"],
  ["day", "Saturday", "Basha W Asakro", "باشا وعساكره", "vermicelli rice", "650"],
  ["day", "Saturday", "Vermicelli Rice", "أرز بالشعيرية", "chutneys  & laban cucumber", "300"],

  // ── Sunday ──
  ["day", "Sunday", "Lamb Beryani", "برياني لحم", "chutneys  & laban cucumber", "700"],
  ["day", "Sunday", "Lamb Shakryia", "لحم شاكرية مع ارز شعيرية", "vermicelli rice", "650"],
  [
    "day",
    "Sunday",
    "Roll Kabab with Eggplant  Tomato sauce",
    "رول كباب مع الباذنجان بصلصة الطماطم",
    "vermicelli rice",
    "650",
  ],
  ["day", "Sunday", "Vermicelli Rice", "أرز بالشعيرية", "", "300"],

  // ── Monday ──
  ["day", "Monday", "Bukari Meat", "بخاري لحم", "chutneys  & laban cucumber", "700"],
  ["day", "Monday", "Macaroni with white sauce", "معكرونة بالبيشاميل", "", "500"],
  ["day", "Monday", "Green beans with lamb", "فاصولياء خضراء مع لحم الضان", "vermicelli rice", "550"],
  [
    "day",
    "Monday",
    "Meat Steak saute w/ vegetables",
    "ستيك لحم سوتية بالخضار",
    "with potato Wedges & wite rice  rice",
    "550",
  ],
  ["day", "Monday", "Vermicelli Rice", "أرز بالشعيرية", "", "300"],

  // ── Tuesday ──
  ["day", "Tuesday", "Lamb Mashbous", "لحم مجبوس", "chutneys  & laban cucumber", "700"],
  ["day", "Tuesday", "Kofta with Tahina", "كفتة بالطحينة", "vermicelli rice", "650"],
  ["day", "Tuesday", "Lamb Okra", "بامية لحم الضأن", "vermicelli rice", "650"],
  [
    "day",
    "Tuesday",
    "Steak chicken w Mashroum sauce",
    "ستيك دجاج مع الفطر",
    "with potato Wedges & white rice",
    "500",
  ],
  ["day", "Tuesday", "Vermicelli Rice", "أرز بالشعيرية", "", "300"],

  // ── Wednesday ──
  ["day", "Wednesday", "Lamb Kabssa", "كبسة مع لحم الضأن", "chutneys  & laban cucumber", "700"],
  ["day", "Wednesday", "Dawood Basha", "لحم داود باشا", "vermicelli rice", "650"],
  ["day", "Wednesday", "Kibbeh bl laban", "كبة بالبن", "vermicelli rice", "600"],
  ["day", "Wednesday", "Beef Stroganouff", "ستروجانوف لحم البقر", "with white rice", "650"],
  ["day", "Wednesday", "Vermicelli Rice", "أرز بالشعيرية", "", "300"],

  // ── Thursday ──
  ["day", "Thursday", "Lamb Makloubeh", "مقلوبة مع لحم الضأن", "chutneys  & laban cucumber", "700"],
  ["day", "Thursday", "Beef Lasagna", "لازانيا", "", "500"],
  ["day", "Thursday", "Stuffed Marrow with Laban", "كوسا محشية باللبن", "vermicelli rice", "650"],
  ["day", "Thursday", "Chicken with potato", "دجاج مع البطاطا", "vermicelli rice", "800"],
  ["day", "Thursday", "Vermicelli Rice", "أرز بالشعيرية", "", "300"],

  // ── Friday ──
  [
    "day",
    "Friday",
    "Lamb Jordanian Manssaf w rice",
    "منسف أردني لحم  مع ارز",
    "Vegetables plate",
    "750",
  ],
  [
    "day",
    "Friday",
    "Green peas with Lamb Meat",
    "البازلاء الخضراء مع لحم الضأن",
    "vermicelli rice",
    "650",
  ],
  ["day", "Friday", "Chicken Beryani", "دجاج برياني", "chutneys  & laban cucumber", "700"],
  ["day", "Friday", "Vermicelli Rice", "أرز بالشعيرية", "", "300"],

  // ── Salads (300 g) ──
  ["salads", "", "Fattoush", "فتوش", "", "300"],
  ["salads", "", "Taboulah", "تبولة", "", "300"],
  ["salads", "", "Rocca Salad", "روكا", "", "300"],
  ["salads", "", "Caeser salad", "سيزر", "Toasted croutons bread", "300"],

  // ── Cold appetizers (250 g) ──
  ["cold", "", "Hummus", "حمص", "", "250"],
  ["cold", "", "Mutable", "متبل", "", "250"],
  ["cold", "", "Baba Ghanoush", "بابا غنوج", "", "250"],
  ["cold", "", "Muhammara", "محمرة", "", "250"],
  ["cold", "", "Stuffed Grape Leaves plate", "ورق عنب بالزيت", "Grenadine molasses", "250"],
  ["cold", "", "Garlic Paste", "معجون ثوم", "", "250"],

  // ── Hot appetizers (piece-based: `pieces x grams`) ──
  ["hot", "", "Fried Kibbeh plate *5 pcs", "صحن كبة مقلية 5 حبات", "tahina sauce", "5x50"],
  [
    "hot",
    "",
    "Grilled Sajeye Kibbeh plate * 1 pcs",
    "كبة صاجية مشوية 1 حبة",
    "tahina sauce",
    "1x150",
  ],
  ["hot", "", "Falafel 6 pcs", "فلافل 6 حبات", "tahina sauce , pickles , bread", "6 pcs"],
];

function slug(s) {
  return String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

let codeSeq = 0;

/**
 * Build a collision-proof item code.
 * Codes must be unique across imports — two rows with the same name imported
 * twice used to collide, which made save/delete act on the wrong record.
 */
export function makeCode(section, name) {
  codeSeq += 1;
  const stamp = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 6);
  return `${section}-${slug(name) || "item"}-${stamp}${codeSeq}${rand}`;
}

/**
 * Starter catalogue, built from MENU_ROWS.
 *
 * Codes are deterministic (section + day + name) so re-seeding never duplicates
 * an existing dish, and so the seed can be re-run after new rows are added to
 * MENU_ROWS to pick up only the additions.
 */
export const SEED_ITEMS = MENU_ROWS.map(
  ([section, day, nameEn, nameAr, servedWith, weightRaw], i) => ({
    code: `${section}-${day ? `${slug(day)}-` : ""}${slug(nameEn)}`,
    section,
    day,
    order: i + 1,
    nameEn,
    nameAr,
    servedWith,
    servedWithAr: SERVED_AR[servedWith] || "",
    weightRaw,
    ingredients: "",
    ingredientsAr: "",
    notes: /pcs/i.test(weightRaw) ? "Piece count only — enter the weight of one piece." : "",
  })
);

/** Blank item used by the "New item" button. */
export const EMPTY_ITEM = {
  code: "",
  section: "day",
  day: "Saturday",
  order: 500,
  nameEn: "",
  nameAr: "",
  servedWith: "",
  servedWithAr: "",
  weightRaw: "",
  ingredients: "",
  ingredientsAr: "",
  notes: "",
  per100: {},
  doc: { method: "", source: "", ref: "", date: "", by: "" },
  weightAtCalc: null,
  ingredientsAtCalc: null,
};

/**
 * Parse a weight string into a total portion weight in grams.
 *
 * Supported forms:
 *   "700"      → 700 g
 *   "350/300"  → 650 g  (dish + accompanying rice, served together)
 *   "5x50"     → 250 g  (5 pieces × 50 g)
 *   "6 pcs"    → no total (piece count only, per-piece weight unknown)
 *
 * @returns {{ total: number|null, parts: number[], pieces: number|null,
 *             each: number|null, raw: string }}
 */
export function parseWeight(raw) {
  const out = { total: null, parts: [], pieces: null, each: null, raw: String(raw ?? "") };
  if (!out.raw.trim()) return out;

  // Normalise: Arabic-Indic digits, multiplication sign, decimal comma, unit suffix.
  const norm = out.raw
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[×✕✖]/g, "x")
    .replace(/,/g, ".")
    .replace(/‏|‎/g, "")
    .trim();

  // "5x50" / "5 × 50 g" → pieces × each
  const mult = norm.match(/^(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)\s*(?:g|gm|gr|grams?|غ|غرام)?$/i);
  if (mult) {
    const pieces = Number(mult[1]);
    const each = Number(mult[2]);
    out.pieces = pieces;
    out.each = each;
    out.total = round1(pieces * each);
    out.parts = [out.total];
    return out;
  }

  // "350/300" → parts served together
  if (norm.includes("/")) {
    const parts = norm
      .split("/")
      .map((p) => Number(String(p).replace(/[^\d.]/g, "")))
      .filter((n) => Number.isFinite(n) && n > 0);
    if (parts.length) {
      out.parts = parts;
      out.total = round1(parts.reduce((a, b) => a + b, 0));
      return out;
    }
  }

  // "6 pcs" / "6 pieces" / "6 حبة" → count only, weight unknown
  const pcs = norm.match(/^(\d+(?:\.\d+)?)\s*(?:pcs?|pieces?|حبة|حبات|قطعة|قطع)$/i);
  if (pcs) {
    out.pieces = Number(pcs[1]);
    return out;
  }

  // Plain number, optionally with a unit
  const plain = norm.match(/(\d+(?:\.\d+)?)/);
  if (plain) {
    out.total = round1(Number(plain[1]));
    out.parts = [out.total];
  }
  return out;
}

function round1(n) {
  return Math.round(n * 10) / 10;
}

/** Total portion weight in grams, or null when it cannot be determined. */
export function totalWeightOf(item) {
  return parseWeight(item?.weightRaw).total;
}

/** Stable sort key so the menu always renders day-by-day in the right order. */
export function sortItems(list) {
  const secIdx = (s) => Math.max(0, SECTIONS.findIndex((x) => x.id === s));
  const dayIdx = (d) => {
    const i = DAYS.indexOf(d);
    return i === -1 ? 99 : i;
  };
  return [...list].sort(
    (a, b) =>
      secIdx(a.section) - secIdx(b.section) ||
      dayIdx(a.day) - dayIdx(b.day) ||
      (a.order ?? 500) - (b.order ?? 500) ||
      String(a.nameEn).localeCompare(String(b.nameEn))
  );
}

/**
 * Parse pasted Excel rows (tab-separated) into catalogue items.
 * Columns: Section/Day | Name EN | Name AR | Served with | Weight
 */
export function parsePastedRows(text) {
  const rows = String(text || "")
    .split(/\r?\n/)
    .map((r) => r.split("\t").map((c) => c.trim()))
    .filter((cells) => cells.some((c) => c));

  const items = [];
  rows.forEach((cells, i) => {
    const [rawSection = "", nameEn = "", nameAr = "", servedWith = "", weightRaw = ""] = cells;
    if (!nameEn && !nameAr) return; // header or blank row

    // Skip an obvious header row
    if (/^(section|day|القسم|اليوم)$/i.test(rawSection) && /^(item|name|الصنف)/i.test(nameEn)) return;

    const dayMatch = DAYS.find(
      (d) =>
        rawSection.toLowerCase().includes(d.toLowerCase()) ||
        rawSection.includes(sectionDayArabic(d))
    );

    let section = "day";
    if (!dayMatch) {
      const s = rawSection.toLowerCase();
      if (/salad|سلط/.test(s)) section = "salads";
      else if (/cold|بارد/.test(s)) section = "cold";
      else if (/hot|ساخن|حار/.test(s)) section = "hot";
    }

    items.push({
      ...EMPTY_ITEM,
      code: makeCode(section, nameEn || nameAr),
      section,
      day: dayMatch || "",
      order: i + 1,
      nameEn,
      nameAr,
      servedWith,
      servedWithAr: "",
      weightRaw,
      per100: {},
      doc: { method: "", source: "", ref: "", date: "", by: "" },
      weightAtCalc: null,
    });
  });

  return items;
}

function sectionDayArabic(day) {
  const map = {
    Saturday: "السبت",
    Sunday: "الأحد",
    Monday: "الإثنين",
    Tuesday: "الثلاثاء",
    Wednesday: "الأربعاء",
    Thursday: "الخميس",
    Friday: "الجمعة",
  };
  return map[day] || day;
}
