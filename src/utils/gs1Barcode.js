// src/utils/gs1Barcode.js
//
// 🏷️ What a scanned barcode says, in our words.
//
//   parseBarcode(text) → { gtin, prodDate, expDate, batch, weightKg, itemCode, gs1, raw }
//
// Two kinds show up on a carton (e.g. a BRF chicken carton):
//   • a plain product barcode (EAN-13 / EAN-8 / UPC-A / ITF-14): only WHICH
//     product it is — the GTIN. Same number on every carton of that product.
//   • a GS1 code (GS1 DataMatrix or GS1-128): a chain of "application
//     identifiers" (AI) carrying the GTIN AND the carton's own data:
//       (01) GTIN-14        (11) production date   (13) packaging date
//       (15) best before    (17) expiry date       (10) batch / lot
//       (21) serial         (310n) net weight kg, n decimals
//     Fixed-length AIs run on; variable ones (10, 21) end at the GS
//     separator (char 29) or at the end of the text.
//
// GTINs are kept as 14 digits (an EAN-13 gets a leading 0), so the plain
// barcode and the GS1 code of the same product find the same entry.
// Dates come back as yyyy-mm-dd. A GS1 date with day 00 means "that month":
// the expiry becomes the month's last day, a production date its first day.

const GS = String.fromCharCode(29);

// AI → fixed data length (null = variable, ends at GS)
const AI = {
  "00": 18, "01": 14, "02": 14, "10": null, "11": 6, "12": 6, "13": 6, "15": 6, "16": 6, "17": 6,
  "20": 2, "21": null, "22": null, "30": null, "37": null, "240": null, "241": null, "250": null, "251": null,
  "400": null, "410": 13, "414": 13, "420": null, "422": 3,
};

function aiAt(s, i) {
  for (const len of [2, 3, 4]) {
    const k = s.slice(i, i + len);
    if (len === 4 && /^3[1-6]\d\d$/.test(k)) return { ai: k, size: 6 };
    if (len < 4 && Object.prototype.hasOwnProperty.call(AI, k)) return { ai: k, size: AI[k] };
  }
  return null;
}

export const isValidGtin = (digits) => {
  const d = String(digits || "");
  if (!/^\d{8}$|^\d{12,14}$/.test(d)) return false;
  const body = d.slice(0, -1).split("").reverse();
  const sum = body.reduce((n, c, i) => n + Number(c) * (i % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === Number(d.slice(-1));
};
export const toGtin14 = (digits) => String(digits || "").padStart(14, "0");

function gs1Date(v, end) {
  if (!/^\d{6}$/.test(v || "")) return "";
  const y = 2000 + Number(v.slice(0, 2));
  const m = Number(v.slice(2, 4));
  let d = Number(v.slice(4, 6));
  if (m < 1 || m > 12) return "";
  if (d === 0) d = end ? new Date(Date.UTC(y, m, 0)).getUTCDate() : 1;
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** Splits GS1 element strings: "(01)…(17)…" or raw with GS separators. */
export function parseGs1(text) {
  let s = String(text || "").trim();
  if (!s) return null;
  // human-readable form with brackets
  if (/^\(\d{2,4}\)/.test(s)) {
    const out = {};
    const re = /\((\d{2,4})\)([^(]*)/g;
    let m;
    while ((m = re.exec(s))) out[m[1]] = m[2].trim();
    return Object.keys(out).length ? out : null;
  }
  // symbology prefix ]d2 (DataMatrix) / ]C1 (GS1-128) / ]Q3 (QR) and a leading FNC1
  s = s.replace(/^\][A-Za-z]\d/, "");
  while (s[0] === GS) s = s.slice(1);
  if (!/^\d{2}/.test(s)) return null;
  const out = {};
  let i = 0;
  while (i < s.length) {
    const hit = aiAt(s, i);
    if (!hit) return Object.keys(out).length ? out : null;
    i += hit.ai.length;
    let val;
    if (hit.size) {
      val = s.slice(i, i + hit.size);
      i += hit.size;
      if (s[i] === GS) i += 1;
    } else {
      const end = s.indexOf(GS, i);
      val = end < 0 ? s.slice(i) : s.slice(i, end);
      i = end < 0 ? s.length : end + 1;
    }
    out[hit.ai] = val;
  }
  return Object.keys(out).length ? out : null;
}

/**
 * Anything the scanner read → what it means for us.
 * { gtin: "07891515408688" | "", prodDate, expDate, batch, weightKg, gs1: bool, raw }
 */
export function parseBarcode(text) {
  const raw = String(text || "").trim();
  const res = { gtin: "", prodDate: "", expDate: "", batch: "", weightKg: 0, itemCode: "", gs1: false, raw };
  if (!raw) return res;

  const digits = raw.replace(/\s/g, "");
  if (/^\d{8}$|^\d{12,14}$/.test(digits) && isValidGtin(digits)) {
    res.gtin = toGtin14(digits);
    return res;
  }

  const ai = parseGs1(raw);
  if (!ai || !(ai["01"] || ai["02"] || ai["17"] || ai["10"] || ai["240"])) return res;
  res.gs1 = true;
  const g = ai["01"] || ai["02"] || "";
  if (/^\d{14}$/.test(g)) res.gtin = g;
  res.prodDate = gs1Date(ai["11"], false) || gs1Date(ai["13"], false);
  res.expDate = gs1Date(ai["17"], true) || gs1Date(ai["15"], true) || gs1Date(ai["16"], true);
  res.batch = String(ai["10"] || "").trim();
  // (240) = our own item code — the labels printed at /inventory/labels carry no GTIN
  res.itemCode = String(ai["240"] || "").trim();
  const w = Object.keys(ai).find((k) => /^310\d$/.test(k));
  if (w && /^\d{6}$/.test(ai[w])) res.weightKg = Number(ai[w]) / 10 ** Number(w[3]);
  return res;
}

/* 📦 Packaging level of a GTIN-14: its first digit (the "indicator").
   0 = the item itself (a piece, or a box sold as one), 1–8 = a higher level
   of the same item (inner box, carton, pallet), 9 = variable measure.
   The 12 digits after it are the item — the same in every level — so a
   carton (1 0629…) and its piece (0 0629…) are the same product. */
export const packLevel = (g14) => (/^\d{14}$/.test(String(g14 || "")) ? Number(String(g14)[0]) : -1);
export const gtinItem = (g14) => (/^\d{14}$/.test(String(g14 || "")) ? String(g14).slice(1, 13) : "");

/* 🌍 GS1 prefix: the first 3 digits of the GTIN-13 (after the level digit of
   a GTIN-14) say which GS1 member office gave the COMPANY its number — where
   the brand owner registered, NOT where the product was made or packed (an
   Emirati company may sell Brazilian meat under 629…). A hint only.
   [from, to, English, Arabic] — 3-digit ranges. */
const GS1_PREFIXES = [
  [0, 139, "USA", "أمريكا"], [200, 299, "In-store number (not a world barcode)", "رقم داخلي للمحل (مش باركود عالمي)"],
  [300, 379, "France", "فرنسا"], [380, 380, "Bulgaria", "بلغاريا"], [383, 383, "Slovenia", "سلوفينيا"], [385, 385, "Croatia", "كرواتيا"],
  [400, 440, "Germany", "ألمانيا"], [450, 459, "Japan", "اليابان"], [460, 469, "Russia", "روسيا"], [471, 471, "Taiwan", "تايوان"],
  [476, 476, "Azerbaijan", "أذربيجان"], [480, 480, "Philippines", "الفلبين"], [487, 487, "Kazakhstan", "كازاخستان"], [489, 489, "Hong Kong", "هونغ كونغ"],
  [490, 499, "Japan", "اليابان"], [500, 509, "United Kingdom", "بريطانيا"], [520, 521, "Greece", "اليونان"], [528, 528, "Lebanon", "لبنان"],
  [529, 529, "Cyprus", "قبرص"], [539, 539, "Ireland", "إيرلندا"], [540, 549, "Belgium", "بلجيكا"], [560, 560, "Portugal", "البرتغال"],
  [569, 569, "Iceland", "آيسلندا"], [570, 579, "Denmark", "الدنمارك"], [590, 590, "Poland", "بولندا"], [594, 594, "Romania", "رومانيا"],
  [599, 599, "Hungary", "هنغاريا"], [600, 601, "South Africa", "جنوب أفريقيا"], [608, 608, "Bahrain", "البحرين"], [609, 609, "Mauritius", "موريشيوس"],
  [611, 611, "Morocco", "المغرب"], [613, 613, "Algeria", "الجزائر"], [616, 616, "Kenya", "كينيا"], [619, 619, "Tunisia", "تونس"],
  [621, 621, "Syria", "سوريا"], [622, 622, "Egypt", "مصر"], [625, 625, "Jordan", "الأردن"], [626, 626, "Iran", "إيران"],
  [627, 627, "Kuwait", "الكويت"], [628, 628, "Saudi Arabia", "السعودية"], [629, 629, "United Arab Emirates", "الإمارات"], [640, 649, "Finland", "فنلندا"],
  [690, 699, "China", "الصين"], [700, 709, "Norway", "النرويج"], [729, 729, "Israel", "إسرائيل"], [730, 739, "Sweden", "السويد"],
  [750, 750, "Mexico", "المكسيك"], [754, 755, "Canada", "كندا"], [760, 769, "Switzerland", "سويسرا"], [770, 771, "Colombia", "كولومبيا"],
  [773, 773, "Uruguay", "الأوروغواي"], [775, 775, "Peru", "البيرو"], [779, 779, "Argentina", "الأرجنتين"], [780, 780, "Chile", "تشيلي"],
  [784, 784, "Paraguay", "الباراغواي"], [789, 790, "Brazil", "البرازيل"], [800, 839, "Italy", "إيطاليا"], [840, 849, "Spain", "إسبانيا"],
  [858, 858, "Slovakia", "سلوفاكيا"], [859, 859, "Czech Republic", "التشيك"], [860, 860, "Serbia", "صربيا"], [868, 869, "Türkiye", "تركيا"],
  [870, 879, "Netherlands", "هولندا"], [880, 880, "South Korea", "كوريا الجنوبية"], [885, 885, "Thailand", "تايلاند"], [888, 888, "Singapore", "سنغافورة"],
  [890, 890, "India", "الهند"], [893, 893, "Vietnam", "فيتنام"], [896, 896, "Pakistan", "باكستان"], [899, 899, "Indonesia", "إندونيسيا"],
  [900, 919, "Austria", "النمسا"], [930, 939, "Australia", "أستراليا"], [940, 949, "New Zealand", "نيوزيلندا"], [955, 955, "Malaysia", "ماليزيا"],
  [977, 979, "Magazine / book number", "رقم مجلة / كتاب"],
];

/**
 * A barcode's GS1 facts: { level, item, prefix, en, ar } | null.
 * level = packaging level digit (GTIN-14; 0 for EAN-13 / UPC), en / ar = the
 * GS1 office ("" when the prefix isn't in the list). Short EAN-8 codes are
 * left out (their prefixes are a different table).
 */
export function gs1Info(text) {
  const d = String(text || "").replace(/\s/g, "");
  if (!/^\d{12,14}$/.test(d) || !isValidGtin(d)) return null;
  const g = toGtin14(d);
  if (/^0{6}/.test(g)) return null; // an EAN-8 padded to 14
  const prefix = g.slice(1, 4);
  const n = Number(prefix);
  const hit = GS1_PREFIXES.find(([lo, hi]) => n >= lo && n <= hi);
  return { level: packLevel(g), item: gtinItem(g), prefix, en: hit ? hit[2] : "", ar: hit ? hit[3] : "" };
}

/** Every country in the GS1 list once (English, Arabic) — the Origin dropdown. */
export const GS1_COUNTRIES = (() => {
  const seen = new Map();
  GS1_PREFIXES.forEach(([lo, , en, ar]) => {
    if ((lo >= 200 && lo <= 299) || lo >= 977) return; // in-store numbers / books — not a country
    en.split(" / ").forEach((name, i) => {
      if (!seen.has(name)) seen.set(name, { en: name, ar: ar.split(" / ")[i] || ar });
    });
  });
  return [...seen.values()].sort((a, b) => a.en.localeCompare(b.en));
})();

/** The country a world barcode's prefix points to ("" = none / not a country). */
export function gs1Country(text) {
  const info = gs1Info(text);
  if (!info || !info.en || GS1_COUNTRIES.every((c) => c.en !== info.en)) return "";
  return info.en;
}

/**
 * A world barcode cut into what its digits mean, for showing it apart:
 *   7891164087661  → { level: "",  prefix: "789", rest: "1164087661" }
 *   17891164087668 → { level: "1", prefix: "789", rest: "1164087661" }
 * null = not a GTIN-13 / GTIN-14.
 */
export function splitGtin(text) {
  const d = String(text || "").replace(/\s/g, "");
  if (!/^\d{13,14}$/.test(d) || !isValidGtin(d)) return null;
  const g = d.length === 14 ? d : `0${d}`;
  return { level: d.length === 14 ? g[0] : "", prefix: g.slice(1, 4), rest: g.slice(4) };
}
