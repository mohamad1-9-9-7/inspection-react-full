// src/utils/gs1Barcode.js
//
// 🏷️ What a scanned barcode says, in our words.
//
//   parseBarcode(text) → { gtin, prodDate, expDate, batch, weightKg, gs1, raw }
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
  const res = { gtin: "", prodDate: "", expDate: "", batch: "", weightKg: 0, gs1: false, raw };
  if (!raw) return res;

  const digits = raw.replace(/\s/g, "");
  if (/^\d{8}$|^\d{12,14}$/.test(digits) && isValidGtin(digits)) {
    res.gtin = toGtin14(digits);
    return res;
  }

  const ai = parseGs1(raw);
  if (!ai || !(ai["01"] || ai["02"] || ai["17"] || ai["10"])) return res;
  res.gs1 = true;
  const g = ai["01"] || ai["02"] || "";
  if (/^\d{14}$/.test(g)) res.gtin = g;
  res.prodDate = gs1Date(ai["11"], false) || gs1Date(ai["13"], false);
  res.expDate = gs1Date(ai["17"], true) || gs1Date(ai["15"], true) || gs1Date(ai["16"], true);
  res.batch = String(ai["10"] || "").trim();
  const w = Object.keys(ai).find((k) => /^310\d$/.test(k));
  if (w && /^\d{6}$/.test(ai[w])) res.weightKg = Number(ai[w]) / 10 ** Number(w[3]);
  return res;
}

