// src/utils/code128.js
//
// 🏷️ Code 128 / GS1-128 encoder — draws the bars our own labels carry.
// (ZXing in the bundle only WRITES QR codes, so the 1-D side lives here.)
//
//   encodeCode128(text | tokens)  → { widths: [2,1,2,…], modules }
//   gs1Tokens("(11)261023(17)261030(10)261023(240)30024")
//                                  → [FNC1,"1","1","2",… FNC1 after a variable field]
//   code128Svg(widths, { height }) → "<svg …>" (black bars, no quiet zone)
//
// Code sets: B for text, C for digit pairs. A run of 4+ digits (or 2+ that
// reach the end) is packed into C — dates and lots are all digits, so a GS1
// label string is almost entirely C and about half the width of plain B.

export const FNC1 = "\u0000FNC1";

/* bar/space widths of the 107 symbols (0–105 = data/start, 106 = stop) */
const P = (
  "212222 222122 222221 121223 121322 131222 122213 122312 132212 221213 " +
  "221312 231212 112232 122132 122231 113222 123122 123221 223211 221132 " +
  "221231 213212 223112 312131 311222 321122 321221 312212 322112 322211 " +
  "212123 212321 232121 111323 131123 131321 112313 132113 132311 211313 " +
  "231113 231311 112133 112331 132131 113123 113321 133121 313121 211331 " +
  "231131 213113 213311 213131 311123 311321 331121 312113 312311 332111 " +
  "314111 221411 431111 111224 111422 121124 121421 141122 141221 112214 " +
  "112412 122114 122411 142112 142211 241211 221114 413111 241112 134111 " +
  "111242 121142 121241 114212 124112 124211 411212 421112 421211 212141 " +
  "214121 412121 111143 111341 131141 114113 114311 411113 411311 113141 " +
  "114131 311141 411131 211412 211214 211232 2331112"
).split(" ");

const START_B = 104;
const START_C = 105;
const TO_B = 100; // "Code B" from set C
const TO_C = 99; // "Code C" from set B
const V_FNC1 = 102;
const STOP = 106;

const isDigit = (t) => typeof t === "string" && t.length === 1 && t >= "0" && t <= "9";

/* how many digits start at i */
function digitRun(tokens, i) {
  let n = 0;
  while (i + n < tokens.length && isDigit(tokens[i + n])) n += 1;
  return n;
}

/** Symbol values for a token list (chars + FNC1), start and checksum included. */
export function code128Values(input) {
  const tokens = Array.isArray(input) ? input : Array.from(String(input || ""));
  for (const t of tokens) {
    if (t === FNC1) continue;
    const c = t.charCodeAt(0);
    if (c < 32 || c > 126) throw new Error(`Code 128: unsupported character "${t}"`);
  }
  const values = [];
  const first = tokens[0] === FNC1 ? 1 : 0;
  const lead = digitRun(tokens, first);
  const allDigits = first + lead === tokens.length;
  let set = lead >= 4 || (allDigits && lead >= 2 && lead % 2 === 0) ? "C" : "B";
  values.push(set === "C" ? START_C : START_B);

  let i = 0;
  while (i < tokens.length) {
    const t = tokens[i];
    if (t === FNC1) { values.push(V_FNC1); i += 1; continue; }
    if (set === "C") {
      if (digitRun(tokens, i) >= 2) {
        values.push(Number(tokens[i] + tokens[i + 1]));
        i += 2;
        continue;
      }
      values.push(TO_B);
      set = "B";
      continue;
    }
    // set B: jump to C when a long enough digit run starts here
    const run = digitRun(tokens, i);
    const toEnd = i + run === tokens.length;
    if (run >= 4 || (toEnd && run >= 2 && run % 2 === 0)) {
      if (run % 2 === 1) { values.push(tokens[i].charCodeAt(0) - 32); i += 1; }
      values.push(TO_C);
      set = "C";
      continue;
    }
    values.push(t.charCodeAt(0) - 32);
    i += 1;
  }

  const check = values.reduce((sum, v, k) => sum + v * (k === 0 ? 1 : k), 0) % 103;
  values.push(check);
  return values;
}

/** The bars: alternating bar/space widths in modules, stop included. */
export function encodeCode128(input) {
  const values = code128Values(input);
  const widths = [];
  values.forEach((v) => P[v].split("").forEach((w) => widths.push(Number(w))));
  P[STOP].split("").forEach((w) => widths.push(Number(w)));
  return { widths, modules: widths.reduce((a, b) => a + b, 0) };
}

/* GS1 AIs whose data has a fixed length — no FNC1 needed after them */
const FIXED = { "00": 18, "01": 14, "02": 14, "11": 6, "12": 6, "13": 6, "15": 6, "16": 6, "17": 6, "20": 2 };
const fixedLen = (ai) => FIXED[ai] || (/^3[1-6]\d\d$/.test(ai) ? 6 : 0);

/** "(11)261023(10)A1(240)30024" → tokens with the leading FNC1 and a
    separator FNC1 after every variable-length field that isn't the last. */
export function gs1Tokens(humanReadable) {
  const parts = [];
  const re = /\((\d{2,4})\)([^(]*)/g;
  let m;
  while ((m = re.exec(String(humanReadable || "")))) parts.push({ ai: m[1], data: m[2] });
  const out = [FNC1];
  parts.forEach((p, k) => {
    out.push(...Array.from(p.ai + p.data));
    if (!fixedLen(p.ai) && k < parts.length - 1) out.push(FNC1);
  });
  return out;
}

/** The raw element string a reader returns for the same data (GS = char 29). */
export function gs1Raw(humanReadable) {
  return gs1Tokens(humanReadable).slice(1).map((t) => (t === FNC1 ? String.fromCharCode(29) : t)).join("");
}

/** Bars as an SVG string, one user unit per module; scale it with CSS. */
export function code128Svg(widths, { height = 40 } = {}) {
  let x = 0;
  let rects = "";
  widths.forEach((w, k) => {
    if (k % 2 === 0) rects += `<rect x="${x}" y="0" width="${w}" height="${height}"/>`;
    x += w;
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${x} ${height}" preserveAspectRatio="none" shape-rendering="crispEdges" style="display:block;width:100%;height:100%" fill="#000">${rects}</svg>`;
}
