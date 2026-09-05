// src/utils/ocrScan.js
// ---------------------------------------------------------------------------
// Return-note scanner (OCR) - runs entirely inside the browser.
// Reads a photo/scan of a transfer/return note and pulls out:
//   - the branch          <- from "POS10/INT/01689" or "Source Location: POS10/ Stock"
//   - the transfer number <- the last part of that same title ("01689"), or,
//                            when that line is unreadable, an "/INT/01689"
//                            tail, a labelled "Reference:" field, or the
//                            number on the branch's own line
//   - the item codes      <- from "[20026] AUS RACK SPECIAL CUTS - KG"
//   - the ordered weight  <- from the ORDERED COLUMN, located by geometry
// The image never leaves the device: nothing is uploaded.
//
// WHY THIS READS THE PAGE AS A TABLE, NOT AS TEXT
// -----------------------------------------------
// Flattened OCR text loses the one thing a transfer note is made of: columns.
// "4.66 KG   0.00 KG" and "466 KG 000 KG" look the same to a regex, a hand-
// written tick after the last column hides the whole quantity run, and nothing
// says which number was Ordered and which was Delivered.
//
// So every page is read with WORD BOXES. The words are grouped into rows by
// their vertical overlap, the "Ordered" / "Delivered" headers give the columns
// their x-bands, and a value is whatever sits inside a band on that row - no
// matter what else the butcher wrote across the line.
//
// THE DECIMAL POINT
// -----------------
// A printed "." is two or three pixels wide. Downscaling a phone photo to a
// page-sized canvas is exactly what destroys it, and "1.68" arriving as "168"
// is a 100x error on a weight.
//
// The weight table of these notes ALWAYS prints exactly two decimals, so the
// point never has to be guessed at - only read, or put back where it is known
// to belong:
//
//   1. ZOOM PASS - once the columns are known, the quantity strip is cut out
//      of the ORIGINAL photo and read again at 3x with a digits-only
//      whitelist. At that size the dot survives, so the number is READ rather
//      than reconstructed. This is where most decimals come from.
//   2. TWO-DECIMAL RULE - a value that arrived without a separator gets one
//      two digits from the right. When the page itself proves the convention
//      (any surviving "0.00" in the Delivered column does), the repair is
//      marked `qtyFixed`; when not one separator survived anywhere, the same
//      repair is marked `qtyAssumed` and the scanner refuses to hand the page
//      over until a human has looked at it.
//   3. ODD-PRECISION FLAG - a value that DID keep a separator but shows one
//      or three decimals cannot be right on this form; it is passed through
//      untouched and flagged, because re-placing that point would be a guess.
//
// Every row also carries `snip`: a cropped, magnified picture of its own
// quantity cell, so the number can be checked against the paper without
// hunting for the line.
// ---------------------------------------------------------------------------

const CDN_SOURCES = [
  "https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js",
  "https://unpkg.com/tesseract.js@5.1.1/dist/tesseract.min.js",
];

/** The weight table of a transfer note always prints this many decimals. */
export const STD_DECIMALS = 2;

let tessPromise = null;

/** Lazily inject the OCR engine (only when the user actually scans). */
export function loadOcrEngine() {
  if (window.Tesseract) return Promise.resolve(window.Tesseract);
  if (tessPromise) return tessPromise;

  tessPromise = new Promise((resolve, reject) => {
    let i = 0;
    const tryNext = () => {
      if (i >= CDN_SOURCES.length) {
        tessPromise = null;
        reject(new Error("Could not load the OCR engine - check the internet connection."));
        return;
      }
      const src = CDN_SOURCES[i++];
      const s = document.createElement("script");
      s.src = src;
      s.async = true;
      s.onload = () => (window.Tesseract ? resolve(window.Tesseract) : tryNext());
      s.onerror = () => {
        s.remove();
        tryNext();
      };
      document.head.appendChild(s);
    };
    tryNext();
  });

  return tessPromise;
}

/* ================= image pre-processing ================= */

/** Decode a file once; every pass and every crop then reuses the bitmap. */
function loadBitmap(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve({ img, release: () => URL.revokeObjectURL(url) });
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not open the image."));
    };
    img.src = url;
  });
}

/** Grayscale + optional ink removal. */
function toGray(px, dropInk) {
  const gray = new Uint8ClampedArray(px.length / 4);
  let min = 255;
  let max = 0;
  for (let i = 0, j = 0; i < px.length; i += 4, j++) {
    const r = px[i];
    const g = px[i + 1];
    const b = px[i + 2];
    const hi = r > g ? (r > b ? r : b) : g > b ? g : b;
    const lo = r < g ? (r < b ? r : b) : g < b ? g : b;
    // Printed text is neutral (hi ~ lo). Pen and stamps are strongly
    // coloured, so anything saturated and not near-black becomes paper.
    const coloured = dropInk && hi - lo > 55 && hi > 95;
    const v = coloured ? 255 : (r * 0.299 + g * 0.587 + b * 0.114) | 0;
    gray[j] = v;
    if (v < min) min = v;
    if (v > max) max = v;
  }
  return { gray, min, max };
}

/**
 * Bradley/Wellner adaptive threshold. `windowDiv` sets the window as a
 * fraction of the width: a small crop needs a proportionally larger window,
 * otherwise the threshold follows the strokes themselves and eats thin marks
 * such as a decimal point.
 */
function binarise(px, gray, w, h, windowDiv, T = 0.14) {
  const iw = w + 1;
  const integral = new Float64Array(iw * (h + 1));
  for (let y = 0; y < h; y++) {
    let rowSum = 0;
    for (let x = 0; x < w; x++) {
      rowSum += gray[y * w + x];
      integral[(y + 1) * iw + (x + 1)] = integral[y * iw + (x + 1)] + rowSum;
    }
  }
  const half = Math.max(6, Math.round(w / windowDiv));
  for (let y = 0; y < h; y++) {
    const y1 = Math.max(0, y - half);
    const y2 = Math.min(h - 1, y + half);
    for (let x = 0; x < w; x++) {
      const x1 = Math.max(0, x - half);
      const x2 = Math.min(w - 1, x + half);
      const count = (x2 - x1 + 1) * (y2 - y1 + 1);
      const sum =
        integral[(y2 + 1) * iw + (x2 + 1)] -
        integral[y1 * iw + (x2 + 1)] -
        integral[(y2 + 1) * iw + x1] +
        integral[y1 * iw + x1];
      const j = y * w + x;
      const v = gray[j] * count <= sum * (1 - T) ? 0 : 255;
      const i = j * 4;
      px[i] = px[i + 1] = px[i + 2] = v;
      px[i + 3] = 255;
    }
  }
}

/**
 * Flat-field correction: take the uneven lighting out of a photographed page.
 *
 * A phone photo of paper is never lit evenly - the hand holding the phone
 * shades one corner, the ceiling light burns another, and the fold of the page
 * runs a soft grey band down the middle. The threshold that follows has to pick
 * ONE local answer per pixel, and where the paper itself is darker than the
 * print elsewhere on the page it either eats faint text or turns shadow into
 * ink. Correcting the light first is what a flatbed scanner does with its lamp.
 *
 * Method: estimate the PAPER (not the text) with a coarse max-pooled grid -
 * ink is dark, so the brightest pixel in a cell larger than a character is
 * paper - smooth that grid, then divide the page by it. Paper goes to a flat
 * 255 everywhere and the print keeps its relative darkness.
 *
 * Cheap on purpose: the grid is ~1/60th of the page on a side, so the whole
 * correction is one pass over the pixels plus arithmetic on a tiny array.
 *
 * @param {Uint8ClampedArray} gray  modified in place
 */
function flattenLight(gray, w, h) {
  const cell = Math.max(8, Math.round(Math.min(w, h) / 24));
  const gw = Math.max(1, Math.ceil(w / cell));
  const gh = Math.max(1, Math.ceil(h / cell));
  let grid = new Float32Array(gw * gh);

  for (let gy = 0; gy < gh; gy++) {
    const y0 = gy * cell;
    const y1 = Math.min(h, y0 + cell);
    for (let gx = 0; gx < gw; gx++) {
      const x0 = gx * cell;
      const x1 = Math.min(w, x0 + cell);
      let m = 0;
      for (let y = y0; y < y1; y++) {
        const row = y * w;
        for (let x = x0; x < x1; x++) if (gray[row + x] > m) m = gray[row + x];
      }
      grid[gy * gw + gx] = m;
    }
  }

  /* Two 3x3 box passes. A cell that happened to land entirely inside a black
     block (a stamp, the dark desk beyond the paper edge) reports no paper at
     all; smoothing lets its neighbours speak for it instead of punching a
     bright hole through that part of the page. */
  for (let pass = 0; pass < 2; pass++) {
    const next = new Float32Array(gw * gh);
    for (let y = 0; y < gh; y++) {
      for (let x = 0; x < gw; x++) {
        let s = 0;
        let n = 0;
        for (let dy = -1; dy <= 1; dy++) {
          const yy = y + dy;
          if (yy < 0 || yy >= gh) continue;
          for (let dx = -1; dx <= 1; dx++) {
            const xx = x + dx;
            if (xx < 0 || xx >= gw) continue;
            s += grid[yy * gw + xx];
            n++;
          }
        }
        next[y * gw + x] = s / n;
      }
    }
    grid = next;
  }

  /* Never divide by a near-black estimate: a page that is genuinely dark all
     over would be amplified into noise. The floor is tied to the brightest
     paper found anywhere, so it scales with the exposure of the photo. */
  let peak = 1;
  for (let i = 0; i < grid.length; i++) if (grid[i] > peak) peak = grid[i];
  const floor = Math.max(24, peak * 0.35);

  // bilinear sampling of the coarse grid, so no cell edge shows as a seam
  for (let y = 0; y < h; y++) {
    const fy = Math.min(gh - 1, Math.max(0, y / cell - 0.5));
    const y0 = fy | 0;
    const y1 = Math.min(gh - 1, y0 + 1);
    const wy = fy - y0;
    const row = y * w;
    for (let x = 0; x < w; x++) {
      const fx = Math.min(gw - 1, Math.max(0, x / cell - 0.5));
      const x0 = fx | 0;
      const x1 = Math.min(gw - 1, x0 + 1);
      const wx = fx - x0;
      const bg =
        grid[y0 * gw + x0] * (1 - wx) * (1 - wy) +
        grid[y0 * gw + x1] * wx * (1 - wy) +
        grid[y1 * gw + x0] * (1 - wx) * wy +
        grid[y1 * gw + x1] * wx * wy;
      const v = (gray[row + x] * 255) / Math.max(floor, bg);
      gray[row + x] = v > 255 ? 255 : v;
    }
  }
  return gray;
}

/**
 * The two knobs a human reaches for when a scan comes out badly: make the page
 * brighter, and make the print harder. Both are plain per-pixel maths applied
 * BEFORE the threshold, which is the only place they can still change what the
 * recogniser sees.
 *
 * @param {number} brightness -100..100
 * @param {number} contrast   -100..100
 */
function applyTone(gray, brightness, contrast) {
  if (!brightness && !contrast) return gray;
  const b = (brightness / 100) * 128;
  const c = Math.max(-100, Math.min(100, contrast));
  const k = (259 * (c + 255)) / (255 * (259 - c));
  for (let i = 0; i < gray.length; i++) {
    gray[i] = k * (gray[i] - 128) + 128 + b;
  }
  return gray;
}

/** Darkest and brightest value present - recomputed after any tone change. */
function rangeOf(gray) {
  let min = 255;
  let max = 0;
  for (let i = 0; i < gray.length; i++) {
    if (gray[i] < min) min = gray[i];
    if (gray[i] > max) max = gray[i];
  }
  return { min, max };
}

/** Plain contrast stretch - keeps grey edges, so small marks survive. */
function stretch(px, gray, min, max) {
  const span = Math.max(1, max - min);
  for (let i = 0, j = 0; i < px.length; i += 4, j++) {
    const v = ((gray[j] - min) * 255) / span;
    px[i] = px[i + 1] = px[i + 2] = v;
    px[i + 3] = 255;
  }
}

/**
 * Render a (region of a) bitmap into an OCR-friendly canvas.
 *
 * @param {HTMLImageElement} img
 * @param {object} opts
 * @param {number} opts.maxSide    longest side in px
 * @param {number} opts.minSide    enlarge a small page up to this (max 2x)
 * @param {number} opts.zoom       explicit magnification; overrides maxSide
 * @param {object} opts.rect       {x0,y0,x1,y1} in the ORIGINAL image's pixels
 * @param {boolean} opts.binary    adaptive black/white (best for printed forms)
 * @param {boolean} opts.dropInk   wipe blue pen / red stamps before reading
 * @returns {{url:string, w:number, h:number, scale:number, rect:object}}
 *          `scale` maps ORIGINAL pixels -> canvas pixels.
 */
function renderFor(img, opts = {}) {
  const {
    maxSide = 2600,
    minSide = 1800,
    zoom = 0,
    binary = true,
    dropInk = true,
    windowDiv = 40,
    flatten = true,
    brightness = 0,
    contrast = 0,
    threshold = 0.14,
  } = opts;
  const rect = opts.rect || { x0: 0, y0: 0, x1: img.width, y1: img.height };
  const rw = Math.max(1, rect.x1 - rect.x0);
  const rh = Math.max(1, rect.y1 - rect.y0);

  /* Small pages used to be read at native size, because the scale was capped
     at 1. A note that arrived through WhatsApp is ~1000px on its long edge, and
     at that size the printed weights are a handful of pixels tall - below what
     the recogniser can resolve, so the decimals were being lost before any of
     the repair logic downstream ever saw them. Enlarging to a workable size is
     the standard remedy for a low-DPI scan; the 2x cap keeps it to smoothing
     what is there rather than inventing detail. */
  const longSide = Math.max(rw, rh);
  let scale;
  if (zoom > 0) scale = zoom;
  else if (longSide > maxSide) scale = maxSide / longSide;
  else if (longSide < minSide) scale = Math.min(2, minSide / longSide);
  else scale = 1;
  const w = Math.max(1, Math.round(rw * scale));
  const h = Math.max(1, Math.round(rh * scale));

  const cv = document.createElement("canvas");
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext("2d", { willReadFrequently: true });
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, rect.x0, rect.y0, rw, rh, 0, 0, w, h);

  const image = ctx.getImageData(0, 0, w, h);
  const px = image.data;
  const { gray, min, max } = toGray(px, dropInk);
  /* Order matters: even out the lighting FIRST, so the user's brightness and
     contrast act on a page that is already uniformly lit - otherwise both
     knobs are spent fighting the shadow instead of the print. */
  let lo = min;
  let hi = max;
  if (flatten) {
    flattenLight(gray, w, h);
    lo = 0;
    hi = 255;
  }
  if (brightness || contrast) {
    applyTone(gray, brightness, contrast);
    const r = rangeOf(gray);
    lo = r.min;
    hi = r.max;
  } else if (flatten) {
    const r = rangeOf(gray);
    lo = r.min;
    hi = r.max;
  }
  if (binary) binarise(px, gray, w, h, windowDiv, threshold);
  else stretch(px, gray, lo, hi);
  ctx.putImageData(image, 0, 0);

  return { url: cv.toDataURL("image/png"), w, h, scale, rect };
}

/** Untouched crop, magnified - what the user is shown to verify a number. */
function snipOf(img, rect, zoom = 2) {
  const rw = Math.max(1, rect.x1 - rect.x0);
  const rh = Math.max(1, rect.y1 - rect.y0);
  const cv = document.createElement("canvas");
  cv.width = Math.max(1, Math.round(rw * zoom));
  cv.height = Math.max(1, Math.round(rh * zoom));
  const ctx = cv.getContext("2d");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, rect.x0, rect.y0, rw, rh, 0, 0, cv.width, cv.height);
  return cv.toDataURL("image/jpeg", 0.72);
}

/**
 * Public single-image helper, kept for callers that only want a cleaned copy.
 * @returns {Promise<string>} a data URL
 */
export async function prepareImage(file, opts = {}) {
  const { img, release } = await loadBitmap(file);
  try {
    /* The preview has to be the page the RECOGNISER gets, not a prettier
       cousin of it - its whole job is to let someone see why a read failed.
       So it walks the same quarter-turn and deskew the real pass walks. */
    const { rotate = 0, deskew = true, ...rest } = opts;
    let bmp = rotateBitmap(img, rotate);
    let angle = 0;
    if (deskew) {
      const straight = deskewBitmap(bmp);
      bmp = straight.img;
      angle = straight.angle;
    }
    const shot = renderFor(bmp, rest);
    return opts.withMeta ? { url: shot.url, angle } : shot.url;
  } finally {
    release();
  }
}

/* ================= recognition ================= */

/** Tesseract 5 hides the words inside blocks; 4 exposed them directly. */
function flattenWords(data) {
  const out = [];
  const push = (w) => {
    if (!w) return;
    const t = String(w.text || "").trim();
    const b = w.bbox || {};
    if (!t || typeof b.x0 !== "number") return;
    out.push({
      text: t,
      x0: b.x0,
      y0: b.y0,
      x1: b.x1,
      y1: b.y1,
      conf: Number.isFinite(w.confidence) ? w.confidence : 0,
    });
  };
  if (Array.isArray(data?.words)) data.words.forEach(push);
  if (!out.length && Array.isArray(data?.blocks)) {
    data.blocks.forEach((bl) =>
      (bl?.paragraphs || []).forEach((pa) =>
        (pa?.lines || []).forEach((ln) => (ln?.words || []).forEach(push))
      )
    );
  }
  if (!out.length && Array.isArray(data?.lines)) {
    data.lines.forEach((ln) => (ln?.words || []).forEach(push));
  }
  return out;
}

/* One worker serves every pass of a scan: creating one costs a full engine
   start-up (and, on a cold browser, the language download), so a multi-pass
   read must not pay for it twice. */
async function makeReader(Tesseract, onLog) {
  if (typeof Tesseract.createWorker !== "function") {
    return {
      read: async (src) => {
        const { data } = await Tesseract.recognize(src, "eng");
        return { text: String(data?.text || ""), words: flattenWords(data) };
      },
      done: async () => {},
    };
  }
  const worker = await Tesseract.createWorker("eng", 1, { logger: onLog });
  return {
    read: async (src, psm, whitelist = "") => {
      await worker.setParameters({
        tessedit_pageseg_mode: String(psm),
        // always written, so a whitelisted pass never leaks into the next one
        tessedit_char_whitelist: whitelist,
      });
      let data;
      try {
        // v5 keeps the geometry in `blocks`; ask for it explicitly
        ({ data } = await worker.recognize(src, {}, { text: true, blocks: true }));
      } catch {
        ({ data } = await worker.recognize(src));
      }
      return { text: String(data?.text || ""), words: flattenWords(data) };
    },
    done: () => worker.terminate(),
  };
}

/* ================= table geometry ================= */

/**
 * The slope of the printed lines, measured from the WORDS rather than the
 * pixels, as dy/dx.
 *
 * These notes are photographed by hand off a phone, so there is no fixed angle
 * and there never will be. The pixel-level deskew earlier in the file corrects
 * what it can, but it is measuring a photograph - it sees the desk, the
 * shadow, the edges of the sheets underneath - and it has to commit to
 * resampling the image on what it decides. By the time the recogniser has run,
 * something far better is available: the words themselves, with their boxes.
 * Nothing but text is in that list, so the same projection-profile idea that
 * is fragile on pixels becomes reliable here.
 *
 * Correcting COORDINATES rather than pixels is the point. The recogniser reads
 * a tilted line perfectly well - on the POS 47 note every code and every
 * weight came back correct - what fails is OUR grouping of words into rows,
 * because it assumes lines run flat. Shearing the boxes fixes that for nothing:
 * no second OCR pass, no resampling, no loss of detail in the decimal points.
 *
 * @returns {number} dy/dx; 0 when the page gives no confident answer
 */
function fitTextShear(words, cx) {
  const pts = [];
  for (const w of words) {
    if (!String(w.text || "").trim()) continue;
    pts.push({
      x: (w.x0 + w.x1) / 2,
      y: (w.y0 + w.y1) / 2,
      h: Math.max(1, w.y1 - w.y0),
    });
  }
  if (pts.length < 25) return 0;

  const hs = pts.map((p) => p.h).sort((a, b) => a - b);
  const bin = Math.max(2, hs[hs.length >> 1] * 0.5);
  let minY = Infinity;
  let maxY = -Infinity;
  for (const p of pts) {
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  const rows = Math.ceil((maxY - minY) / bin) + 1;
  if (rows < 4) return 0;

  const MAX = 0.14; // ~8 degrees, the same ceiling the pixel deskew uses
  // padded, for the same reason as estimateSkewFromGray: clamping stray
  // entries into the end bins makes a sum of squares reward steep slopes
  const score = (m) => {
    const pad = Math.ceil((Math.abs(m) * 2000) / bin) + 2;
    const hist = new Float64Array(rows + 2 * pad + 1);
    for (const p of pts) {
      const k = ((p.y - m * (p.x - cx) - minY) / bin + pad) | 0;
      if (k >= 0 && k < hist.length) hist[k]++;
    }
    let s = 0;
    for (let i = 0; i < hist.length; i++) s += hist[i] * hist[i];
    return s;
  };

  let best = 0;
  let bestScore = -1;
  for (let m = -MAX; m <= MAX + 1e-9; m += 0.002) {
    const s = score(m);
    if (s > bestScore) {
      bestScore = s;
      best = m;
    }
  }
  for (let m = best - 0.002; m <= best + 0.002 + 1e-9; m += 0.0002) {
    if (m < -MAX || m > MAX) continue;
    const s = score(m);
    if (s > bestScore) {
      bestScore = s;
      best = m;
    }
  }

  // a winner on the edge of the sweep is the sweep running out of room, not a
  // peak - the same trap the pixel deskew fell into
  if (Math.abs(best) > MAX - 0.004) return 0;
  // below this the drift across a whole page is under a couple of pixels
  return Math.abs(best) < 0.0015 ? 0 : best;
}

/**
 * Word boxes with the page's tilt taken out of their coordinates.
 *
 * `y0/y1` become the straightened values - so every stage that groups, bands
 * or matches by height works on a square page - while `iy0/iy1` keep where the
 * word really is in the photo, which is what the magnified crops need.
 */
function shearWords(words, m, cx) {
  if (!m) return words.map((w) => ({ ...w, iy0: w.y0, iy1: w.y1 }));
  return words.map((w) => {
    const d = m * ((w.x0 + w.x1) / 2 - cx);
    return { ...w, iy0: w.y0, iy1: w.y1, y0: w.y0 - d, y1: w.y1 - d };
  });
}

/** Where a straightened height sits in the real photo, at a given x. */
const imageY = (y, x, m, cx) => y + m * (x - cx);

/** Group words into printed rows by vertical overlap. */
function groupRows(words) {
  const ws = words.slice().sort((a, b) => a.y0 + a.y1 - (b.y0 + b.y1) || a.x0 - b.x0);
  const rows = [];
  for (const w of ws) {
    const h = Math.max(1, w.y1 - w.y0);
    let row = null;
    for (let i = rows.length - 1; i >= 0 && i >= rows.length - 5; i--) {
      const r = rows[i];
      const overlap = Math.min(r.y1, w.y1) - Math.max(r.y0, w.y0);
      if (overlap > 0.4 * Math.min(h, r.y1 - r.y0)) {
        row = r;
        break;
      }
    }
    if (!row) {
      row = { y0: w.y0, y1: w.y1, words: [] };
      rows.push(row);
    }
    row.y0 = Math.min(row.y0, w.y0);
    row.y1 = Math.max(row.y1, w.y1);
    row.words.push(w);
  }
  rows.forEach((r) => {
    r.words.sort((a, b) => a.x0 - b.x0);
    r.text = r.words.map((w) => w.text).join(" ");
  });
  /* The printed order of the note is the order of these rows - the parser
     takes each row's INDEX as its position on the paper - so it is stated
     here rather than left to fall out of how the rows happened to be built.
     A row is created the first time a word cannot join an existing one, and
     its box then GROWS as more words arrive; a tall row created early can end
     up centred below one created after it, which would quietly hand the draft
     two products in the wrong order. Sorting on the finished boxes costs
     nothing and makes the guarantee real. */
  const leftmost = (r) => (r.words.length ? r.words[0].x0 : 0);
  rows.sort((a, b) => a.y0 + a.y1 - (b.y0 + b.y1) || leftmost(a) - leftmost(b));
  return rows;
}

const letters = (s) => String(s || "").toLowerCase().replace(/[^a-z]/g, "");

/**
 * Turn the "Ordered" / "Delivered" headers into x-bands.
 * Values are printed under their header, so the midpoint between the two
 * headers separates the columns; the outer edges get the same half-width.
 */
function findColumns(rows, pageW) {
  let ord = null;
  let del = null;
  let headerY = 0;
  for (const r of rows) {
    let found = false;
    for (const w of r.words) {
      const t = letters(w.text);
      if (!ord && t.length >= 6 && t.length <= 9 && t.startsWith("order")) {
        ord = w;
        found = true;
      } else if (!del && t.length >= 8 && t.length <= 11 && t.startsWith("deliver")) {
        del = w;
        found = true;
      }
    }
    // ONLY the row a header was found on. Advancing this on every later row -
    // which is what happens when the second header is unreadable and the loop
    // never breaks - pushes the table's top past the last product line and
    // throws the whole page away.
    if (found) headerY = Math.max(headerY, r.y1);
    if (ord && del) break;
  }
  if (!ord && !del) return null;

  const cOf = (w) => (w.x0 + w.x1) / 2;
  if (ord && del) {
    const cO = cOf(ord);
    const cD = cOf(del);
    const gap = Math.max(20, cD - cO);
    return {
      headerY,
      ordered: { x0: cO - gap * 0.6, x1: cO + gap * 0.45 },
      delivered: { x0: cD - gap * 0.45, x1: cD + gap * 0.6 },
    };
  }
  // only one header survived: give it a band the width of a typical column
  const w = pageW * 0.075;
  const c = cOf(ord || del);
  const band = { x0: c - w, x1: c + w };
  return ord
    ? { headerY, ordered: band, delivered: null }
    : { headerY, ordered: { x0: c - 3 * w, x1: c - w }, delivered: band };
}

const NUM_RE = /\d{1,6}(?:[.,]\d{1,3})?/;

/**
 * Fill the rows whose weight went missing, by WHERE the number sits on the
 * page rather than by which line the recogniser filed it under.
 *
 * Everything upstream keys a weight to its product by asking the OCR row
 * group for it, and that group is built from vertical overlap alone. On a
 * photographed page that is a fragile thing to rest on: a product name sits at
 * the far left and its weight 800px away at the far right, so half a degree of
 * residual tilt, or the gentle curl of a sheet that will not lie flat, is
 * enough to push the number out of its own line's box. The row then reports no
 * weight at all - which is exactly the "6 codes, 3 weights" shape - while the
 * number is sitting there in the column, read correctly, belonging to nobody.
 *
 * So: take every number printed in the ordered column, drop the ones already
 * claimed by a row that got its weight, and give each still-empty row the
 * nearest unclaimed one within about a row's height. Order is preserved
 * because both lists run down the page, and nothing already read is touched -
 * this can only fill blanks, never overwrite a value.
 *
 * @param {Array} rows      the page's row groups, top to bottom
 * @param {Array} out       geo rows being built, parallel to `rows`
 * @param {object} band     the ordered column's x-range
 * @param {Array} points    numeric sightings in that column: {y, text, conf}
 */
function rescueByPosition(rows, out, band, points, isProduct = () => true) {
  if (!band || !points.length) return 0;

  /* ONLY the lines that name a product take part.
     When the offset below grows past half a line, the weights stop overlapping
     their product line at all and the grouper files them as rows OF THEIR OWN
     - rows that carry a weight and no item code, which reach the report as
     nothing. Letting those orphans claim a weight (they sit right on top of
     it) is what defeated the first version of this rescue: the product line
     stayed empty and its number was already spoken for. */
  const idx = [];
  for (let i = 0; i < rows.length; i++) if (isProduct(rows[i], i)) idx.push(i);
  if (!idx.length) return 0;

  const cyOf = (r) => (r.y0 + r.y1) / 2;
  /* Line pitch, not row height: the gap between one product and the next is
     what says whether a number belongs to this line or the one above. Taken as
     a median so a double-height line or a missed row cannot set it. */
  const gaps = [];
  for (let k = 1; k < idx.length; k++) gaps.push(cyOf(rows[idx[k]]) - cyOf(rows[idx[k - 1]]));
  gaps.sort((a, b) => a - b);
  const pitch = gaps.length ? gaps[gaps.length >> 1] : 0;
  const span = pitch > 4 ? pitch : Math.max(18, (rows[idx[0]].y1 - rows[idx[0]].y0) * 1.4);

  const pts = points.map((p, j) => ({ ...p, j })).sort((a, b) => a.y - b.y);

  /* The offset is SYSTEMATIC, so measure it instead of tolerating it.
     A page photographed at a slight angle - or one that will not lie flat -
     carries the right-hand column a fixed distance above (or below) the names
     on the left, and that distance is the same for every line. Taking the
     median of "nearest number minus this line" recovers it from the page
     itself, and matching around the corrected position afterwards is far
     tighter than simply widening the tolerance, which is what would start
     stealing the row above's weight. */
  const deltas = [];
  for (const i of idx) {
    const cy = cyOf(rows[i]);
    let best = Infinity;
    for (const p of pts) {
      const d = p.y - cy;
      if (Math.abs(d) < Math.abs(best)) best = d;
    }
    if (Math.abs(best) < span * 1.5) deltas.push(best);
  }
  deltas.sort((a, b) => a - b);
  const shift = deltas.length ? deltas[deltas.length >> 1] : 0;

  // a weight already read on its own line speaks for the number under it
  const claimed = new Set();
  for (const i of idx) {
    if (!out[i].qty) continue;
    for (const p of pts) {
      if (p.y >= rows[i].y0 - 2 && p.y <= rows[i].y1 + 2) claimed.add(p.j);
    }
  }

  /* Assignment runs down the page and never goes back up: both lists are in
     printed order, so a pairing that crosses an earlier one is wrong however
     close it looks. Without that rule a single missing weight lets every line
     below it take its neighbour's, and a shifted column of plausible numbers
     is far worse than a blank one. */
  let filled = 0;
  let floor = -Infinity;
  for (const i of idx) {
    if (out[i].qty) {
      // advance past THIS row's own number only - taking the lowest claimed
      // point anywhere would push the floor below rows still to be filled
      for (const p of pts) {
        if (p.y >= rows[i].y0 - 2 && p.y <= rows[i].y1 + 2 && p.y > floor) floor = p.y;
      }
      continue;
    }
    const want = cyOf(rows[i]) + shift;
    let pick = null;
    let best = Infinity;
    for (const p of pts) {
      if (claimed.has(p.j) || p.y <= floor) continue;
      const d = Math.abs(p.y - want);
      if (d < span * 0.6 && d < best) {
        best = d;
        pick = p;
      }
    }
    if (!pick) continue;
    claimed.add(pick.j);
    floor = pick.y;
    out[i].qty = pick.text;
    out[i].qtySrc = "near";
    out[i].qtyConf = pick.conf;
    filled++;
  }
  return filled;
}

/** Read one column band on one row: the first number printed inside it. */
function bandValue(row, band) {
  if (!band) return null;
  const inside = row.words.filter((w) => {
    const c = (w.x0 + w.x1) / 2;
    return c >= band.x0 && c <= band.x1;
  });
  if (!inside.length) return null;
  const m = inside.map((w) => w.text).join(" ").match(NUM_RE);
  if (!m) return null;
  const conf = Math.min(...inside.map((w) => (Number.isFinite(w.conf) ? w.conf : 100)));
  return { text: m[0].replace(",", "."), conf };
}

/** Every separator printed anywhere on the page - proof of the convention. */
function separatorEvidence(source) {
  const hits = String(source || "").match(/\b\d{1,6}[.,]\d{1,3}\b/g) || [];
  return hits.map((h) => h.length - h.search(/[.,]/) - 1);
}

/**
 * Read the whole quantity strip again, straight out of the original photo and
 * magnified, with a digits-only whitelist. This is the pass that actually
 * recovers decimal points: at 3x a printed dot is ~8px instead of ~2px.
 */
/**
 * The image settings that a render honours, taken off a page's tune.
 *
 * `threshold` is deliberately NOT included by callers that render in grey:
 * there is no threshold to move there, and passing one would read as if the
 * knob had been applied when it had not.
 */
export function toneOf(tune = {}) {
  const out = {};
  if (tune.flatten === false) out.flatten = false;
  if (tune.brightness) out.brightness = tune.brightness;
  if (tune.contrast) out.contrast = tune.contrast;
  if (tune.threshold) out.threshold = tune.threshold;
  return out;
}

async function zoomQuantities(reader, img, cols, rows, pageScale, tune, shear = 0, cx = 0) {
  if (!cols || !rows.length) return { values: new Map(), points: [], evidence: [] };

  const bands = [cols.ordered, cols.delivered].filter(Boolean);
  const left = Math.min(...bands.map((b) => b.x0));
  const right = Math.max(...bands.map((b) => b.x1));
  /* The rows arrive STRAIGHTENED; the crop has to come out of the real photo.
     Both ends of the strip are checked because a tilted line enters the strip
     at one height and leaves it at another - taking only one would slice the
     top or the bottom off the digits. */
  const edges = [left, right].map((x) => imageY(0, x, shear, cx));
  const lift = [Math.min(...edges), Math.max(...edges)];
  const top = Math.min(...rows.map((r) => r.y0)) + lift[0];
  const bottom = Math.max(...rows.map((r) => r.y1)) + lift[1];
  const padX = (right - left) * 0.06;
  const padY = Math.max(6, (bottom - top) * 0.03);

  // prepared-canvas coordinates -> original photo pixels
  const toOrig = (v) => v / pageScale;
  const rect = {
    x0: Math.max(0, Math.floor(toOrig(left - padX))),
    y0: Math.max(0, Math.floor(toOrig(top - padY))),
    x1: Math.min(img.width, Math.ceil(toOrig(right + padX))),
    y1: Math.min(img.height, Math.ceil(toOrig(bottom + padY))),
  };
  if (rect.x1 - rect.x0 < 20 || rect.y1 - rect.y0 < 20) {
    return { values: new Map(), points: [], evidence: [] };
  }

  // 3x, and only mildly cleaned: an aggressive threshold is what erases dots
  const zoom = Math.min(4, Math.max(2, 2600 / Math.max(1, rect.x1 - rect.x0)));
  const { threshold, ...tone } = toneOf(tune);
  const shot = renderFor(img, { rect, zoom, binary: false, dropInk: true, ...tone });
  const { text, words } = await reader.read(shot.url, 6, "0123456789.,");

  const values = new Map();
  /* Every number this pass found in the ordered column, with where it sits.
     `values` can only reach rows the page pass had already grouped correctly;
     a note whose lines the grouper split loses its weight there and nowhere
     else, so the raw sightings are kept for the positional rescue below. */
  const points = [];
  const evidence = separatorEvidence(text);

  // strip coordinates -> prepared-canvas coordinates
  const back = (x, y) => ({
    x: (rect.x0 + x / zoom) * pageScale,
    y: (rect.y0 + y / zoom) * pageScale,
  });

  for (const w of words) {
    const m = String(w.text).match(NUM_RE);
    if (!m) continue;
    const p = back((w.x0 + w.x1) / 2, (w.y0 + w.y1) / 2);
    const inOrdered =
      cols.ordered && p.x >= cols.ordered.x0 && p.x <= cols.ordered.x1;
    if (!inOrdered) continue;
    // back into the straightened frame the rows live in
    const sy = p.y - shear * (p.x - cx);
    const value = { text: m[0].replace(",", "."), conf: w.conf };
    points.push({ y: sy, ...value });
    const row = rows.find((r) => sy >= r.y0 - 2 && sy <= r.y1 + 2);
    if (!row) continue;
    if (values.has(row)) continue; // leftmost wins: the column's own number
    values.set(row, value);
  }
  return { values, points, evidence };
}

/* ================= deskew ================= */

/* A hand-held photo of a note is never square to the page, and everything
   downstream assumes it is: groupRows() collects a printed line by VERTICAL
   OVERLAP, and findColumns() gives each column a fixed horizontal band. Tilt
   the page and both break at the same time - on a 2800px-tall page a 2° tilt
   slides a column sideways by ~98px, which is wider than the band itself, so
   the quantities in the lower half of the note stop landing in their own
   column and are read as missing.

   That is damage worth PREVENTING rather than repairing: straighten the page
   once, before the first read, and every later stage sees the square table it
   was written for. */

/** Angles beyond this are not tilt - they are a rotated or misfiled page. */
const MAX_SKEW_DEG = 8;
/** Below this there is nothing to win, and rotating only resamples the text. */
const MIN_SKEW_DEG = 0.25;

/**
 * The tilt of a page of printed lines, in degrees (positive = clockwise).
 *
 * Projection-profile method: shear the dark pixels by a candidate angle and
 * histogram them by row. Text lines stack into tall narrow spikes only when
 * the shear matches the true tilt, so the angle that maximises the sum of
 * squared row counts is the tilt. Shearing (y - x*tan) rather than rotating
 * keeps it to one multiply per pixel, which is what makes a full sweep cheap
 * enough to run on every page.
 *
 * Pure and array-only on purpose: no canvas, so it is directly testable.
 *
 * @param {Uint8ClampedArray|Uint8Array|number[]} gray  one byte per pixel
 * @param {number} w
 * @param {number} h
 * @param {number} threshold  a pixel darker than this counts as ink
 */
function estimateSkewFromGray(gray, w, h, threshold = 128) {
  if (w < 40 || h < 40) return 0;

  /* Ink coordinates once - the sweep then costs one pass per angle over the
     marks alone, not over the whole raster. Columns are sampled on wide pages
     so a very large image does not make the sweep quadratic. */
  const stepX = Math.max(1, Math.round(w / 900));
  const stepY = Math.max(1, Math.round(h / 900));
  const xs = [];
  const ys = [];
  for (let y = 0; y < h; y += stepY) {
    const row = y * w;
    for (let x = 0; x < w; x += stepX) {
      if (gray[row + x] < threshold) {
        xs.push(x);
        ys.push(y);
      }
    }
  }
  // a blank or nearly blank page has no lines to square up
  if (xs.length < 200) return 0;

  const cx = w / 2;
  /* The histogram is PADDED by the largest shift this angle can produce, so
     every candidate angle is scored over the exact same ink.

     Clamping stray ink into the first and last bin instead (what this did
     until 3 Sep 2026) is not a rounding detail: the score is a sum of
     SQUARES, so those two bins grow quadratically as the shear pushes more
     ink off the page, and the sweep then rewards the steepest angle it is
     allowed. One dark corner - a desk edge, a shadow, the black strip under a
     photographed page - was enough to pin the answer at MAX_SKEW_DEG and
     rotate a square page by 8 degrees, which slides the lower half of the
     table out of its own column and empties most of the note. */
  const score = (deg) => {
    const t = Math.tan((deg * Math.PI) / 180);
    const pad = Math.ceil((w / 2) * Math.abs(t)) + 1;
    const hist = new Float64Array(h + 2 * pad + 1);
    for (let i = 0; i < xs.length; i++) {
      const y = ys[i] - (xs[i] - cx) * t + pad;
      hist[y | 0]++;
    }
    let s = 0;
    for (let i = 0; i < hist.length; i++) s += hist[i] * hist[i];
    return s;
  };

  /* Coarse sweep, then refine around the winner. A single fine sweep over the
     whole range would cost 8x more for the same answer. */
  let best = 0;
  let bestScore = -1;
  for (let d = -MAX_SKEW_DEG; d <= MAX_SKEW_DEG; d += 0.5) {
    const s = score(d);
    if (s > bestScore) {
      bestScore = s;
      best = d;
    }
  }
  for (let d = best - 0.5; d <= best + 0.5; d += 0.05) {
    if (d < -MAX_SKEW_DEG || d > MAX_SKEW_DEG) continue;
    const s = score(d);
    if (s > bestScore) {
      bestScore = s;
      best = d;
    }
  }

  /* A real tilt is a PEAK: the lines stack at one angle and the score falls
     away on both sides. A winner sitting on the edge of the sweep is not a
     peak, it is the sweep running out of room - the page is either past
     MAX_SKEW_DEG (not tilt, a misfiled page) or something other than text
     lines is driving the profile. Rotating on that reading damages a page
     that reads fine untouched, so it is refused rather than trusted. */
  if (Math.abs(best) > MAX_SKEW_DEG - 0.5) return 0;

  return Math.abs(best) < MIN_SKEW_DEG ? 0 : Number(best.toFixed(2));
}
/** A small grayscale copy - enough to measure the tilt, cheap to produce. */
function grayRasterFor(img, maxSide = 1000) {
  const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));
  const cv = document.createElement("canvas");
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext("2d", { willReadFrequently: true });
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, w, h);
  const px = ctx.getImageData(0, 0, w, h).data;
  const gray = new Uint8ClampedArray(w * h);
  for (let i = 0, j = 0; i < px.length; i += 4, j++) {
    gray[j] = (px[i] * 0.299 + px[i + 1] * 0.587 + px[i + 2] * 0.114) | 0;
  }
  /* Ink is whatever is clearly darker than the paper. A fixed cut-off would
     call a dim photo all ink and a bright one all paper, so the threshold is
     taken from this page's own range. */
  let min = 255;
  let max = 0;
  for (let j = 0; j < gray.length; j++) {
    if (gray[j] < min) min = gray[j];
    if (gray[j] > max) max = gray[j];
  }
  return { gray, w, h, threshold: min + (max - min) * 0.45 };
}

/**
 * Straighten a photographed page before anything reads it.
 *
 * Returns a canvas, which every later stage accepts exactly where it accepted
 * the image - so the whole pipeline keeps its simple "canvas pixels = original
 * pixels x scale" mapping, and the quantity crops still line up with what the
 * user is shown.
 *
 * @returns {{img: HTMLImageElement|HTMLCanvasElement, angle: number}}
 *          the original and 0 when the page is already square enough
 */
function deskewBitmap(img) {
  let angle = 0;
  try {
    const { gray, w, h, threshold } = grayRasterFor(img);
    angle = estimateSkewFromGray(gray, w, h, threshold);
  } catch {
    return { img, angle: 0 };
  }
  if (!angle) return { img, angle: 0 };

  const rad = (angle * Math.PI) / 180;
  const cos = Math.abs(Math.cos(rad));
  const sin = Math.abs(Math.sin(rad));
  const w = img.width;
  const h = img.height;
  // the upright page needs the rotated bounding box, or the corners are cropped
  const nw = Math.ceil(w * cos + h * sin);
  const nh = Math.ceil(w * sin + h * cos);

  try {
    const cv = document.createElement("canvas");
    cv.width = nw;
    cv.height = nh;
    const ctx = cv.getContext("2d", { willReadFrequently: true });
    // paper, not black - the new corners must threshold as background
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, nw, nh);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.translate(nw / 2, nh / 2);
    ctx.rotate(-rad);
    ctx.drawImage(img, -w / 2, -h / 2);
    return { img: cv, angle };
  } catch {
    return { img, angle: 0 };
  }
}

/**
 * Turn a page by a quarter turn before anything reads it.
 *
 * Deskew only ever corrects a few degrees - by design, because beyond that it
 * is not tilt. A note photographed sideways or upside down is therefore not a
 * hard page, it is an unreadable one: every line runs the wrong way and the
 * recogniser returns nothing at all. There is no reliable way to guess the
 * intended orientation of a form from its pixels, so this is a control the
 * user turns, not something the pipeline decides.
 *
 * @param {number} deg  0, 90, 180 or 270, clockwise
 */
function rotateBitmap(img, deg) {
  const d = ((Math.round(deg / 90) * 90) % 360 + 360) % 360;
  if (!d) return img;
  const w = img.width;
  const h = img.height;
  const swap = d === 90 || d === 270;
  const cv = document.createElement("canvas");
  cv.width = swap ? h : w;
  cv.height = swap ? w : h;
  const ctx = cv.getContext("2d", { willReadFrequently: true });
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.translate(cv.width / 2, cv.height / 2);
  ctx.rotate((d * Math.PI) / 180);
  ctx.drawImage(img, -w / 2, -h / 2);
  return cv;
}

/* ================= page pipeline ================= */

/**
 * Read a whole stack of notes with ONE engine start-up.
 *
 * Per page:
 *   pass 1  black/white, whole page  -> word boxes (the table geometry)
 *   pass 2  grayscale, column mode   -> a second opinion on mangled lines (deep)
 *   pass 3  the quantity strip only, magnified, digits only (deep + columns)
 *
 * onProgress({ index, count, overall }) - index is the page being read now,
 * overall is 0..1 across the whole stack. Returns one page object per file, in
 * the order the files were given: { text, geo }.
 */
export async function ocrImages(files, onProgress, opts = {}) {
  const { deep = true, tune = null } = opts;
  /* `tune` is per PAGE, not per stack: one bad photo in a batch gets its own
     brightness without dragging the others off a setting that already worked.
     A single object still applies to everything, which is what a plain
     "read them all again" wants. */
  const tuneAt = (i) => (Array.isArray(tune) ? tune[i] || {} : tune || {});
  const Tesseract = await loadOcrEngine();

  const passes = deep
    ? [
        { prep: { binary: true }, psm: 6 },
        { prep: { binary: false }, psm: 4 },
      ]
    : [{ prep: { binary: true }, psm: 6 }];

  const list = Array.from(files || []);
  // the zoom pass is short but not free; count it so the bar does not stall
  const perPage = passes.length + (deep ? 0.5 : 0);
  const total = Math.max(1, list.length * perPage);
  let finished = 0;
  let current = 0;

  const report = (frac) => {
    if (onProgress) {
      onProgress({
        index: current,
        count: list.length,
        overall: Math.min(1, (finished + frac) / total),
      });
    }
  };

  const reader = await makeReader(Tesseract, (m) => {
    if (m && m.status === "recognizing text" && typeof m.progress === "number") {
      report(m.progress);
    }
  });

  const out = [];
  try {
    for (current = 0; current < list.length; current++) {
      // `texts` keeps the passes apart: a line only the second pass caught has
      // to be placed by its own line number, not after the whole first pass
      const page = { text: "", texts: [], geo: null, skew: 0, shear: 0 };
      let bitmap = null;
      try {
        bitmap = await loadBitmap(list[current]);
      } catch {
        out.push(page);
        finished += perPage;
        report(0);
        continue;
      }
      /* Straighten first. groupRows() collects a line by vertical overlap and
         findColumns() gives each column a fixed horizontal band, so both are
         measured against a page that is assumed square; a tilted photo slides
         the lower rows out of their own column. Correcting it here means every
         later stage - including the quantity crops shown to the user - works on
         one already-square page. */
      const { img: rawImg, release } = bitmap;
      const tuning = tuneAt(current);
      // a quarter turn is the user's call, and it has to happen before the
      // skew is measured - lines running down the page have no tilt to find
      const upright = rotateBitmap(rawImg, tuning.rotate || 0);
      const straight = deskewBitmap(upright);
      const img = straight.img;
      page.skew = straight.angle;
      try {
        const texts = [];
        let words = [];
        let pageScale = 1;
        let pageW = img.width;

        for (let i = 0; i < passes.length; i++) {
          const { prep, psm } = passes[i];
          const shot = renderFor(img, { ...prep, ...toneOf(tuning) });
          const res = await reader.read(shot.url, psm);
          texts.push(res.text);
          if (i === 0) {
            words = res.words;
            pageScale = shot.scale;
            pageW = shot.w;
          }
          finished++;
          report(0);
        }
        page.texts = texts;
        page.text = texts.join("\n");

        /* --- geometry: rows, columns, per-row quantities --- */
        if (words.length) {
          /* Straighten the COORDINATES before anything is grouped by height.
             The photo is taken freehand off a phone - there is no fixed angle
             to rely on - and every stage below this line assumes lines run
             flat: groupRows collects by vertical overlap, findColumns hands
             out fixed x-bands, the zoom pass matches numbers to rows by y. */
          const shearCx = pageW / 2;
          const shear = fitTextShear(words, shearCx);
          page.shear = shear;
          words = shearWords(words, shear, shearCx);
          const atX = (y, x) => imageY(y, x, shear, shearCx);
          const allRows = groupRows(words);
          const cols = findColumns(allRows, pageW);
          const bodyRows = cols ? allRows.filter((r) => r.y0 >= cols.headerY - 2) : allRows;

          let zoomed = { values: new Map(), points: [], evidence: [] };
          if (cols && deep) {
            const qtyRows = bodyRows.filter(
              (r) => bandValue(r, cols.ordered) || bandValue(r, cols.delivered)
            );
            try {
              zoomed = await zoomQuantities(
                reader,
                img,
                cols,
                qtyRows,
                pageScale,
                tuning,
                shear,
                shearCx
              );
            } catch {
              /* the zoom pass is an improvement, never a requirement */
            }
          }
          if (deep) {
            finished += 0.5;
            report(0);
          }

          const toOrig = (v) => v / pageScale;
          /* Weights first, crops after. The rescue below can hand a row the
             weight its own line lost, and that row has to end up with the
             magnified crop of the cell like any other - a value nobody can
             check against the paper is the one kind this dialog refuses to
             produce. Building the crop in the same pass would have given the
             rescued rows a blank. */
          const geoRows = bodyRows.map((r) => {
            const col = cols ? bandValue(r, cols.ordered) : null;
            const del = cols ? bandValue(r, cols.delivered) : null;
            const zoom = zoomed.values.get(r) || null;
            const chosen = zoom || col;
            return {
              text: r.text,
              qty: chosen ? chosen.text : "",
              qtySrc: zoom ? "zoom" : col ? "column" : "",
              qtyConf: chosen ? chosen.conf : 0,
              delivered: del ? del.text : "",
              snip: "",
            };
          });

          if (cols) {
            /* The page pass sees the whole sheet, the zoom pass sees only the
               quantity strip but reads it far better. Both are offered to the
               rescue, the sharper one first. */
            const pagePoints = words
              .filter((w) => {
                const c = (w.x0 + w.x1) / 2;
                return (
                  cols.ordered &&
                  c >= cols.ordered.x0 &&
                  c <= cols.ordered.x1 &&
                  (w.y0 + w.y1) / 2 >= cols.headerY &&
                  NUM_RE.test(String(w.text))
                );
              })
              .map((w) => ({
                y: (w.y0 + w.y1) / 2,
                text: String(w.text).match(NUM_RE)[0].replace(",", "."),
                conf: Number.isFinite(w.conf) ? w.conf : 0,
              }));
            /* A line is a product line if it names a product. Non-global on
               purpose: BRACKETED carries /g, and .test() on a /g regex keeps
               lastIndex between calls, so every other row would come back
               false. */
            const CODE_ON_LINE = new RegExp(BRACKETED.source);
            rescueByPosition(
              bodyRows,
              geoRows,
              cols.ordered,
              [...(zoomed.points || []), ...pagePoints],
              (r) => CODE_ON_LINE.test(r.text || "")
            );
          }

          const band = cols ? cols.ordered || cols.delivered : null;
          if (band) {
            const padX = (band.x1 - band.x0) * 0.15;
            /* The row's height is straightened; the cell to cut out is not.
               Lifting it back by the tilt at the COLUMN's own x is what keeps
               a crop on the digits instead of half a line above them - and a
               weight nobody can check against the paper is the one thing this
               dialog will not produce. */
            const bandCx = (band.x0 + band.x1) / 2;
            bodyRows.forEach((r, i) => {
              if (!geoRows[i].qty) return;
              try {
                const padY = (r.y1 - r.y0) * 0.4;
                geoRows[i].snip = snipOf(
                  img,
                  {
                    x0: Math.max(0, Math.floor(toOrig(band.x0 - padX))),
                    y0: Math.max(0, Math.floor(toOrig(atX(r.y0 - padY, bandCx)))),
                    x1: Math.min(img.width, Math.ceil(toOrig(band.x1 + padX))),
                    y1: Math.min(img.height, Math.ceil(toOrig(atX(r.y1 + padY, bandCx)))),
                  },
                  2
                );
              } catch {
                geoRows[i].snip = "";
              }
            });
          }

          page.geo = { rows: geoRows, hasColumns: !!cols, evidence: zoomed.evidence };
        } else if (deep) {
          finished += 0.5;
          report(0);
        }
      } catch {
        /* One unreadable page must not throw away the pages already read, nor
           the ones still queued behind it. Whatever this page did produce
           before it failed is kept; the scanner reports it as an empty page. */
      } finally {
        release();
      }
      out.push(page);
    }
  } finally {
    await reader.done();
  }

  if (onProgress) onProgress({ index: list.length - 1, count: list.length, overall: 1 });
  return out;
}

/** Single-page convenience wrapper. onProgress(0..1). */
export async function ocrImage(file, onProgress, opts = {}) {
  const pages = await ocrImages(
    [file],
    (p) => {
      if (onProgress) onProgress(p.overall);
    },
    opts
  );
  return pages[0] || { text: "", geo: null };
}

/* ================= parsing ================= */

const CONFUSIONS = {
  O: "0", o: "0", Q: "0", D: "0", U: "0",
  I: "1", l: "1", i: "1", "|": "1", "!": "1", "]": "1", "[": "1",
  S: "5", s: "5", B: "8", G: "6", b: "6", Z: "2", z: "2", T: "7", A: "4", g: "9", q: "9",
};

/* Every item code on these notes is printed inside square brackets -
   "[27119]" - which is the strongest anchor on the page. OCR abuses it in
   three ways, and all three are handled below: it swaps a bracket for a
   lookalike ( ( { < | ! ), it loses one of the pair, or it reads a bracket as
   a DIGIT and leaks it into the number ("[27119]" -> "127119"). */
const CODE_CLASS = "0-9OoQDUIliSsBGbZzTAgq";
const OPEN_BRACKET = String.raw`[[({<|!]`;
const CLOSE_BRACKET = String.raw`[\])}>|!]`;
/** "[27119]", "[ 27119", "27119]", "(27119)" - one bracket is enough. */
const BRACKETED = new RegExp(
  String.raw`${OPEN_BRACKET}\s*([${CODE_CLASS}]{4,7})\s*${CLOSE_BRACKET}?` +
    String.raw`|([${CODE_CLASS}]{4,7})\s*${CLOSE_BRACKET}`,
  "g"
);

/**
 * Turn an OCR'd token into plausible pure-digit codes (handles O/0, l/1,
 * S/5 ...). An over-long reading is also offered without its first and
 * without its last character, because that is what a bracket read as a digit
 * looks like once it has leaked into the number.
 */
export function digitVariants(raw) {
  const t = String(raw || "").replace(/[^0-9A-Za-z]/g, "");
  if (!t) return [];
  const out = [];
  const push = (v) => {
    if (v && v.length >= 4 && v.length <= 6 && !out.includes(v)) out.push(v);
  };
  let fixed = "";
  for (const ch of t) {
    fixed += /[0-9]/.test(ch) ? ch : CONFUSIONS[ch] !== undefined ? CONFUSIONS[ch] : ch;
  }
  if (/^[0-9]+$/.test(t)) push(t);
  if (/^[0-9]+$/.test(fixed)) {
    push(fixed);
    // tried only after the full reading, so a genuine 6-digit code wins first
    if (fixed.length > 4) {
      push(fixed.slice(1));
      push(fixed.slice(0, -1));
    }
  }
  return out;
}

/* ---------- catalog resolution ---------- */

/** Catalog codes grouped by length, for the near-miss search below. */
function buildCodeIndex(catalog) {
  const byLen = new Map();
  catalog.forEach((item, digits) => {
    const k = String(digits).length;
    if (!byLen.has(k)) byLen.set(k, []);
    byLen.get(k).push({ digits: String(digits), item });
  });
  return byLen;
}

/**
 * Catalog codes that differ from `cand` in exactly ONE digit.
 *
 * OCR gets a single digit wrong far more often than two, so this is where a
 * code that matched nothing usually really belongs. It is only ever acted on
 * when the answer is unambiguous, or when the product NAME printed on the
 * same line picks a winner - a guess between two real products would put the
 * wrong meat on the report.
 */
function nearMisses(cand, index) {
  const bucket = index.get(cand.length) || [];
  const hits = [];
  for (const e of bucket) {
    let diff = 0;
    for (let i = 0; i < cand.length && diff < 2; i++) {
      if (e.digits[i] !== cand[i]) diff++;
    }
    if (diff === 1) hits.push(e);
  }
  return hits;
}

/** The catalog item a line's bracketed token really means, if any. */
function resolveCode(cands, line, catalog, index, nameIndex) {
  for (const c of cands) {
    const item = catalog.get(c);
    if (item) return { code: c, item, via: "code" };
  }
  const toks = nameTokens(lineNamePart(line));
  for (const c of cands) {
    const near = nearMisses(c, index);
    if (!near.length) continue;
    if (near.length === 1) {
      return { code: near[0].digits, item: near[0].item, via: "corrected" };
    }
    let best = null;
    let bestScore = 0;
    for (const e of near) {
      const sc = tokenScore(toks, nameTokens(e.item.description));
      if (sc > bestScore) {
        bestScore = sc;
        best = e;
      }
    }
    if (best && bestScore >= 0.45) {
      return { code: best.digits, item: best.item, via: "corrected" };
    }
  }
  // several plausible codes and nothing to choose between them: say so rather
  // than pick one, and let the name matcher downstream have its turn
  return null;
}

/**
 * An exact catalog hit can still be the WRONG product: one misread digit can
 * land on another real code ("34346" read as "34348" is a hit either way).
 *
 * The product name printed on the same line is the independent witness. When
 * it disagrees with the code we matched but agrees with a one-digit
 * neighbour, the row keeps the code it read and carries the neighbour as a
 * SUGGESTION - the scanner offers it as a one-click swap. It is never applied
 * silently: an exact code is still evidence, and only a human can see the
 * paper.
 */
function codeDoubt(item, code, line, index) {
  const toks = nameTokens(lineNamePart(line));
  if (toks.length < 2) return null;
  const own = tokenScore(toks, nameTokens(item.description));
  if (own >= 0.3) return null; // the name backs the code up - nothing to say
  let best = null;
  let bestScore = 0;
  for (const e of nearMisses(code, index)) {
    const sc = tokenScore(toks, nameTokens(e.item.description));
    if (sc > bestScore) {
      bestScore = sc;
      best = e;
    }
  }
  if (!best || bestScore < 0.5 || bestScore <= own + 0.2) return null;
  return { code: best.digits, name: best.item.description };
}

/**
 * OCR spaces out the characters of a short code - "WKC" comes back as
 * "W K C", and the app's own label for that branch is spelled with the spaces
 * too. So a branch is matched character by character, with a gap allowed
 * between each one.
 */
const rxEscape = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
function loosePattern(label) {
  const chars = String(label || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!chars) return "";
  return chars.split("").map(rxEscape).join(String.raw`\s{0,2}`);
}

/**
 * Two to four letters, then an OPTIONAL number: "POS 10", "FTR 2", "WKC".
 * The number used to be required, which is why a letters-only branch was
 * never found at all - not even on its own title line.
 */
const BRANCH_TOKEN = String.raw`[A-Z](?:\s{0,2}[A-Z]){1,3}(?:\s{0,2}-?\s{0,2}\d{1,2})?`;

/** Branch token -> the label used in the app ("POS10" -> "POS 10"). */
export function normalizeBranch(raw, branchList = []) {
  const t = String(raw || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!t) return "";
  const hit = branchList.find(
    (b) => String(b).toUpperCase().replace(/[^A-Z0-9]/g, "") === t
  );
  if (hit) return hit;
  const m = t.match(/^([A-Z]{2,4})(\d{1,2})$/);
  if (m) {
    const spaced = `${m[1]} ${Number(m[2])}`;
    const hit2 = branchList.find(
      (b) => String(b).toUpperCase().replace(/\s+/g, " ").trim() === spaced
    );
    return hit2 || spaced;
  }
  return t;
}

/* ---------- name matching (rescues lines whose code is unreadable) ---------- */

const STOP_WORDS = new Set(["KG", "PCS", "THE", "AND", "OF", "IN", "PC"]);

function nameTokens(s) {
  return String(s || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .split(" ")
    .filter((t) => t.length > 2 && !STOP_WORDS.has(t) && !/^\d+$/.test(t));
}

/** Strip the code, the quantities and the trailing noise off a product line. */
function lineNamePart(line) {
  let s = String(line || "");
  s = s.replace(/[[({<|]\s*[0-9OoIlSBGZTQDU]{4,6}\s*[\])}>|]/g, " "); // [20026]
  s = s.replace(/^[^A-Za-z]*[0-9OoIlSBGZTQDU]{4,6}\b/, " "); // leading bare code
  s = s.replace(/\d+[.,]\d+\s*(KG|PCS)?/gi, " "); // 0.27 KG
  s = s.replace(/\b(KG|PCS|Ordered|Delivered|Draft|Stock)\b/gi, " ");
  return s.trim();
}

/** Dice similarity between two token sets (0..1). */
function tokenScore(a, b) {
  if (!a.length || !b.length) return 0;
  const setB = new Set(b);
  let hit = 0;
  const seen = new Set();
  for (const t of a) {
    if (seen.has(t)) continue;
    seen.add(t);
    if (setB.has(t)) hit++;
  }
  return (2 * hit) / (seen.size + new Set(b).size);
}

/**
 * TEXT fallback for a page whose columns could not be located.
 *
 * The quantity columns sit at the very END of a product line:
 *
 *   [20026] AUS RACK SPECIAL CUTS - KG        5.00   5.00
 *                                          ordered  delivered
 *
 * so only a trailing run of bare numbers counts - that is what keeps a number
 * belonging to the NAME out of it ("HABAQ 20 GM" ends in an unrecognised
 * unit). ONE stray mark is tolerated after the run, because a hand-written
 * tick in the margin regularly lands there and used to hide the whole line's
 * quantity - but a tick is a single letter ("v") or a scribble ("~"), never a
 * two-letter unit, so "20 GM" is still refused. Returns the first number of
 * the run (Ordered).
 */
const QTY_NUM = String.raw`\d{1,6}(?:[.,]\d{1,3})?`;
// the unit may follow EVERY number, not just the last one ("15.20 KG 0.00 KG")
// PLATE and TRAY come off the prepared-food notes (POS 47 sends both, mixed
// with KG on the same sheet); without them the fallback text pass reads
// "1.00 PLATE" as a bare number followed by a word and drops the line.
const QTY_UNIT = String.raw`(?:\s*(?:KGS?|PCS|PC|PIECES|UNITS?|LTRS?|LITRES?|BOX|CTN|PLATES?|TRAYS?|PKTS?))?`;
const QTY_TAIL = new RegExp(
  // capture a longer run than we are willing to accept, so that a line which is
  // really a row of loose numbers gets REJECTED below instead of trimmed to fit
  `(?:^|\\s)((?:${QTY_NUM}${QTY_UNIT}\\s+){0,6}${QTY_NUM}${QTY_UNIT})` +
    `(?:\\s*(?:[^\\sA-Za-z0-9.,]{1,3}|[A-Za-z]))?\\s*$`,
  "i"
);
const QTY_PICK = new RegExp(QTY_NUM, "g");
function orderedQty(line) {
  // the bracketed item code is not a quantity
  const s = String(line || "").replace(/[[({<|]\s*[0-9OoIlSBGZTQDU]{4,6}\s*[\])}>|]/g, " ");
  const m = s.match(QTY_TAIL);
  if (!m) return "";
  const nums = m[1].match(QTY_PICK) || [];
  if (!nums.length || nums.length > 4) return ""; // a garbled line, not a quantity column
  // returned exactly as printed: whether it kept its separator is the signal
  // fixQuantities() needs below.
  return String(nums[0]).replace(",", ".");
}

/** How trustworthy a reading is; only the weakest are ever discarded. */
const VIA_RANK = { code: 3, corrected: 2, name: 1, ocr: 0 };
/** Where a weight came from - a better source always wins. */
const QTY_RANK = { zoom: 3, column: 2, near: 2, text: 1, "": 0 };

/**
 * Drop the phantom rows the extra OCR passes invent.
 *
 * A page is read more than once and the passes are merged, so a line one pass
 * garbles becomes a SECOND entry: a bogus "221501" next to the good "22160",
 * or a name-recovered "15009-1" for a row already found by its code. A phantom
 * carries the same Ordered weight as the row it is a copy of, and sits at the
 * same place on the paper.
 *
 * BOTH of those have to hold. Matching on the weight alone - which is what this
 * did - assumed two products on one note never weigh the same. They do, all the
 * time: 1.00, 2.00, 5.00 repeat down a returns note, and every later product
 * sharing a weight with an earlier code-matched row was deleted as a phantom,
 * silently, before the user ever saw the draft. Position is what tells a second
 * reading of one line apart from a second line.
 *
 * A row the geometry located is exempt outright: the table pass measured it at
 * a real height on the page, so it was printed there, whatever its code
 * resolution ended up looking like.
 */
/* Two readings of ONE printed line land within a row of each other: a text
   pass anchors its duplicate at <geo row> + 0.5. Two genuinely different
   products are at least a whole row apart. */
const SAME_LINE_SPAN = 1.01;

function dropPassDuplicates(entries) {
  const key = (q) => String(q || "").replace(/[.,]/g, "").replace(/^0+(?=\d)/, "");
  const at = (e) => (Number.isFinite(e.order) ? e.order : Infinity);
  /* A weight the geometry pulled out of the table is a line that was SEEN on
     the paper at a measured height. Whatever its code resolution looks like,
     it is a real printed row and never a phantom. */
  const located = (e) =>
    e.qtySrc === "zoom" || e.qtySrc === "column" || e.qtySrc === "near";
  const strong = (e) => (VIA_RANK[e.via] ?? 0) >= VIA_RANK.code;

  /* Where each weight was read confidently — positions, not just the value.
     Matching on the value alone was deleting real rows: round weights repeat
     all over a returns note, so any second product that also weighed 5.00 was
     taken for a phantom of the first and dropped without a trace. */
  const strongAt = new Map();
  for (const e of entries) {
    if (!e.qty || !strong(e)) continue;
    const k = key(e.qty);
    if (!strongAt.has(k)) strongAt.set(k, []);
    strongAt.get(k).push(at(e));
  }

  return entries.filter((e) => {
    if (!e.qty || strong(e) || located(e)) return true;
    const spots = strongAt.get(key(e.qty));
    if (!spots) return true;
    // only a weak reading sitting ON a confident one is the same line twice
    return !spots.some((o) => Math.abs(o - at(e)) <= SAME_LINE_SPAN);
  });
}

/**
 * Put the decimal point back where the form says it belongs.
 *
 * The weight table always prints two decimals, so a value that arrived
 * without a separator is not ambiguous - it is simply missing its point, and
 * "174" is 1.74. What changes between pages is only how much the page itself
 * can VOUCH for that:
 *
 *   qtyFixed    a separator survived somewhere on this page (usually the
 *               "0.00" of the Delivered column), so the convention is proven
 *   qtyAssumed  not one separator survived; the repair rests on the form's
 *               standard alone, and the scanner makes the user confirm it
 *   qtyOdd      the value KEPT a separator but with one or three decimals,
 *               which this form never prints - left untouched and flagged,
 *               because moving that point would be a guess
 *
 * `evidence` is every decimal length seen on the page (raw text + zoom pass).
 * Returns the number of decimals the page proved, or 0 when it proved none.
 */
function fixQuantities(entries, evidence) {
  const proven = (evidence || []).filter((d) => d === STD_DECIMALS).length > 0;

  for (const e of entries) {
    let v = String(e.qty || "");
    if (!v) continue;
    e.qtyRaw = v;

    const dot = v.indexOf(".");
    if (dot < 0) {
      const pad = v.padStart(STD_DECIMALS + 1, "0");
      v = `${pad.slice(0, pad.length - STD_DECIMALS)}.${pad.slice(pad.length - STD_DECIMALS)}`;
      if (proven) e.qtyFixed = true;
      else e.qtyAssumed = true;
    } else if (v.length - dot - 1 !== STD_DECIMALS) {
      e.qtyOdd = true;
    }

    const n = Number(v);
    if (!Number.isFinite(n) || n <= 0 || n > 99999) {
      e.qty = "";
      e.qtyFixed = false;
      e.qtyAssumed = false;
      e.qtyOdd = false;
    } else {
      e.qty = n.toFixed(STD_DECIMALS);
    }
  }
  return proven ? STD_DECIMALS : 0;
}

/** Best catalog item for a product line, by name. */
function matchByName(line, nameIndex) {
  const toks = nameTokens(lineNamePart(line));
  if (toks.length < 2 || !nameIndex.length) return null;
  let best = null;
  let bestScore = 0;
  for (const entry of nameIndex) {
    const sc = tokenScore(toks, entry.tokens);
    if (sc > bestScore) {
      bestScore = sc;
      best = entry;
    }
  }
  return bestScore >= 0.5 ? { item: best.item, score: bestScore } : null;
}

/**
 * Pull the branch + the item codes out of a scanned page.
 * @param {string|object} input  a page from ocrImages() - { text, geo } - or,
 *                               for callers that only have text, the raw text
 * @param {object} opts
 * @param {string[]} opts.branches  the app's branch list (for exact matching)
 * @param {Map} opts.catalog        digitsOnlyCode -> { item_code, description }
 */
export function parseReturnNote(input, { branches = [], catalog = new Map() } = {}) {
  const page = typeof input === "string" || input == null ? { text: input } : input;
  const raw = String(page.text || "");
  const geo = page.geo || null;
  const textLines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  /* The draft has to read like the paper: same products, same order. Every
     candidate line therefore carries an `order`, and the finished rows are
     sorted by it at the end.

     The geometry pass already delivers its rows top-to-bottom, so its index
     IS the printed order. A line that only the flat text pass caught still
     belongs where it is PRINTED, not appended at the bottom, so it is placed
     next to the row the geometry pass put there - matched by product name.
     When nothing matches, it keeps its own line number, which is the printed
     order of whichever pass found it. */
  const rows = [];
  const geoRows = geo?.rows || [];
  const geoTokens = geoRows.map((r) => nameTokens(lineNamePart(r.text)));

  geoRows.forEach((r, i) =>
    rows.push({
      text: r.text,
      qty: r.qty || "",
      qtySrc: r.qtySrc || "",
      qtyConf: r.qtyConf || 0,
      snip: r.snip || "",
      order: i,
    })
  );

  /** Which located row a text line is, by product name - null if unknown. */
  const anchorOf = (line) => {
    if (!geoRows.length) return null;
    const toks = nameTokens(lineNamePart(line));
    if (toks.length < 2) return null;
    let best = -1;
    let bestScore = 0;
    geoTokens.forEach((gt, i) => {
      const sc = tokenScore(toks, gt);
      if (sc > bestScore) {
        bestScore = sc;
        best = i;
      }
    });
    return best >= 0 && bestScore >= 0.4 ? best : null;
  };

  /* A line the geometry never saw is placed BETWEEN its neighbours that it
     did see: the lines above and below it on the paper are the same lines in
     both readings, so their located positions bracket the missing one. */
  const placeText = (anchors, idx) => {
    if (anchors[idx] != null) return anchors[idx] + 0.5;
    let prev = -1;
    let next = -1;
    for (let i = idx - 1; i >= 0; i--) if (anchors[i] != null) { prev = i; break; }
    for (let i = idx + 1; i < anchors.length; i++) if (anchors[i] != null) { next = i; break; }
    if (prev >= 0 && next >= 0) {
      const span = anchors[next] - anchors[prev];
      if (span > 0) return anchors[prev] + (span * (idx - prev)) / (next - prev);
    }
    if (prev >= 0) return anchors[prev] + (idx - prev) * 0.01;
    if (next >= 0) return anchors[next] - (next - idx) * 0.01;
    // no geometry on this page at all: the line number IS the printed order,
    // and both passes number the same paper, so they interleave correctly
    return geoRows.length + idx;
  };

  // each pass is walked separately, so its line numbers stay comparable
  const passTexts = Array.isArray(page.texts) && page.texts.length ? page.texts : [raw];
  passTexts.forEach((t) => {
    const lines = String(t || "").split(/\r?\n/).map((l) => l.trim());
    const anchors = lines.map((line) => (line ? anchorOf(line) : null));
    lines.forEach((line, idx) => {
      if (!line) return;
      rows.push({
        text: line,
        qty: "",
        qtySrc: "",
        qtyConf: 0,
        snip: "",
        order: placeText(anchors, idx),
      });
    });
  });

  const headLines = [...(geo?.rows || []).map((r) => r.text), ...textLines];
  const searchText = headLines.join("\n");

  const nameIndex = [];
  catalog.forEach((item) => {
    const tokens = nameTokens(item.description);
    if (tokens.length) nameIndex.push({ item, tokens });
  });

  /* ---------- branch + document / transfer number ---------- */
  let branchRaw = "";
  let docNo = "";
  let transferNo = "";

  // 1) the big title:  POS10/INT/01689
  for (const ln of headLines) {
    const m = ln.match(
      new RegExp(
        String.raw`\b(${BRANCH_TOKEN})\s*[/\\|]\s*([A-Z]{2,4})\s*[/\\|]\s*(\d{3,8})\b`,
        "i"
      )
    );
    if (m) {
      branchRaw = m[1];
      transferNo = m[3]; // "02323" - kept exactly as printed, leading zeros and all
      docNo = `${m[1].replace(/\s+/g, "")}/${m[2].toUpperCase()}/${transferNo}`;
      break;
    }
  }
  // 2) the title was mangled, but the "/INT/01689" tail survived
  if (!transferNo) {
    for (const ln of headLines) {
      const m = ln.match(/\b(?:INT|OUT|IN|RET)\s*[/\\|]\s*(\d{3,8})\b/i);
      if (m) { transferNo = m[1]; break; }
    }
  }

  // 3) a labelled field: "Reference: POS10/INT/01689", "Doc No 01689", …
  if (!transferNo) {
    const m = searchText.match(
      /(?:Reference|Ref|Transfer|Source\s*Document|Doc(?:ument)?)\s*(?:No\.?|Number|#)?\s*[:\-#]?\s*(?:[A-Z0-9\s-]{0,12}[/\\|])*(\d{3,8})\b/i
    );
    if (m) transferNo = m[1];
  }

  // fallback: "Source Location: POS10/ Stock"
  if (!branchRaw) {
    const m = searchText.match(
      new RegExp(String.raw`Source\s*Locat\w*\s*[:\-]?\s*(${BRANCH_TOKEN})`, "i")
    );
    if (m) branchRaw = m[1];
  }
  // 3) last resort: the first label from the app's OWN branch list that appears
  //    anywhere on the page, however OCR spaced it out. Driven by the list
  //    rather than by a hard-coded prefix, so a branch that is letters only -
  //    or one added later - is found without touching this file. Longest
  //    first, so "POS 4" cannot win inside "POS 41".
  if (!branchRaw) {
    const plain = (b) => String(b).replace(/[^A-Za-z0-9]/g, "");
    const byLength = branches.filter(Boolean).slice();
    byLength.sort((a, b) => plain(b).length - plain(a).length);
    for (const b of byLength) {
      const pat = loosePattern(b);
      if (pat.length < 3) continue;
      if (new RegExp(String.raw`\b${pat}\b`, "i").test(searchText)) {
        branchRaw = b;
        break;
      }
    }
  }
  // 3b) no branch list was passed in: fall back to the prefixes we know
  if (!branchRaw) {
    const prefixes = ["POS", "FTR", "KMC", "KPS", "WKC", "QCS"].map(loosePattern).join("|");
    const m = searchText.match(
      new RegExp(String.raw`\b(${prefixes})\s{0,2}-?\s{0,2}(\d{1,2})?\b`, "i")
    );
    if (m) branchRaw = `${m[1]}${m[2] || ""}`;
  }

  // 4) the branch is known: take the number from its own "POS10 / … / 01689"
  //    line even when the middle segment is unreadable.
  //    Deliberately never a bare number: item codes are 5 digits too, and
  //    grabbing one of those would put a product code in the transfer field.
  if (!transferNo && branchRaw) {
    const tag = branchRaw.replace(/[\s-]/g, "");
    for (const ln of headLines) {
      if (ln.replace(/[\s-]/g, "").toUpperCase().indexOf(tag.toUpperCase()) < 0) continue;
      const m = ln.match(/[/\\|]\s*[A-Z]{0,4}\s*[/\\|]?\s*(\d{3,8})\b/i);
      if (m) { transferNo = m[1]; break; }
    }
  }

  if (transferNo && !docNo) docNo = transferNo;

  const branch = branchRaw ? normalizeBranch(branchRaw, branches) : "";

  /* ---------- item codes ---------- */
  const seen = new Map(); // code -> entry
  const codes = [];
  const unread = [];

  const NOISE =
    /TRN\s*#|Shipping\s*Date|Destination\s*Locat|Source\s*Locat|Signature|Storekeeper|Receiver|Live\s*stock|City\s*:|Tel\s*:|Ordered|Delivered/i;

  const codeIndex = buildCodeIndex(catalog);

  const add = (code, item, row, via, extra) => {
    const key = String(code);
    const qty = row.qty || orderedQty(row.text);
    const qtySrc = row.qty ? row.qtySrc : qty ? "text" : "";

    /* The same code CAN be printed twice on one note - two lots of the same
       product, two weights. The passes also invent duplicates, so the two are
       told apart by where the weight came from: two rows that the GEOMETRY
       located at different heights with different weights are two printed
       lines, and both are kept. Anything else is the same line read twice. */
    const fromTable = (s) => s === "zoom" || s === "column" || s === "near";
    const twin = seen.get(key);
    const printedTwice =
      twin &&
      qty &&
      twin.qty &&
      qty !== twin.qty &&
      fromTable(qtySrc) &&
      fromTable(twin.qtySrc) &&
      Number.isFinite(row.order) &&
      row.order !== twin.order;

    if (twin && !printedTwice) {
      const prev = twin;
      if (!prev.matched && item) {
        prev.matched = true;
        prev.name = item.description;
        prev.via = via;
      }
      // the same row read twice: keep the reading that came from the better
      // source, so a column/zoom weight is never replaced by a text guess
      if (qty && (QTY_RANK[qtySrc] || 0) > (QTY_RANK[prev.qtySrc] || 0)) {
        prev.qty = qty;
        prev.qtySrc = qtySrc;
        prev.qtyConf = row.qtyConf || 0;
        if (row.snip) prev.snip = row.snip;
      }
      return true;
    }
    const entry = {
      code: item ? item.item_code : key,
      matched: !!item,
      name: item ? item.description : "",
      qty, // the ORDERED column, exactly as read; repaired by fixQuantities()
      qtySrc, // "zoom" | "column" | "text" | ""
      qtyConf: row.qtyConf || 0,
      qtyRaw: "", // what the scan actually produced, before any repair
      qtyFixed: false, // decimal point restored, convention proven by the page
      qtyAssumed: false, // decimal point restored from the form's standard only
      qtyOdd: false, // kept a separator, but not the two decimals this form prints
      snip: row.snip || "", // magnified crop of this row's quantity cell
      via, // "code" | "corrected" | "name" | "ocr"
      order: Number.isFinite(row.order) ? row.order : Number.MAX_SAFE_INTEGER,
      suggest: null, // a better code the printed name points at, if any
      line: String(row.text || "").slice(0, 90),
      ...(extra || {}),
    };
    // the FIRST sighting stays the one later readings merge into, so a second
    // printed line of the same product cannot swallow them
    if (!twin) {
      seen.set(key, entry);
      if (item && !seen.has(String(item.item_code))) {
        seen.set(String(item.item_code), entry);
      }
    }
    codes.push(entry);
    return true;
  };

  for (const row of rows) {
    const ln = row.text;
    if (NOISE.test(ln)) continue;
    if (docNo && ln.includes(docNo.slice(0, 6))) continue;

    // a product row either carries a bracketed code or a "0.27 KG" quantity
    const tokens = [];
    let m;
    BRACKETED.lastIndex = 0;
    while ((m = BRACKETED.exec(ln))) tokens.push(m[1] || m[2]);

    let leading = null;
    if (!tokens.length) {
      const lead = ln.match(new RegExp(String.raw`^[^0-9A-Za-z]*([${CODE_CLASS}]{4,6})[\s\].,)]`));
      if (lead) leading = lead[1];
    }

    const looksLikeProduct =
      tokens.length > 0 ||
      /\d+[.,]\d{1,3}\s*(KG|PCS)\b/i.test(ln) ||
      (!!leading && /[A-Za-z]{4,}/.test(ln));

    if (!looksLikeProduct) continue;

    // every pure-digit reading this line's bracketed token could be, best first
    const cands = tokens.length
      ? tokens.flatMap(digitVariants)
      : leading
      ? digitVariants(leading)
      : [];

    // 1) the code as printed, a digit-confusion fix of it, or - when nothing
    //    matches - the single catalog code one digit away from it
    const hit = cands.length ? resolveCode(cands, ln, catalog, codeIndex, nameIndex) : null;
    if (hit) {
      const suggest =
        hit.via === "code" ? codeDoubt(hit.item, hit.code, ln, codeIndex) : null;
      add(hit.code, hit.item, row, hit.via, suggest ? { suggest } : null);
      continue;
    }

    // 2) the code is unreadable -> recover the row from its product name
    const byName = matchByName(ln, nameIndex);
    if (byName) {
      add(byName.item.item_code, byName.item, row, tokens.length || leading ? "corrected" : "name");
      continue;
    }

    // 3) keep an unknown but clearly-printed code so the user can check it
    if (cands.length) {
      add(cands[0], null, row, "ocr");
      continue;
    }

    // 4) nothing usable - report the line so the user knows what was missed
    const cleaned = lineNamePart(ln);
    if (cleaned.replace(/[^A-Za-z]/g, "").length >= 6) unread.push(ln.slice(0, 90));
  }

  // a line reported as unread in one pass may have been read in another
  const readTokens = codes.filter((c) => c.matched).map((c) => nameTokens(c.name));
  const unreadFiltered = [];
  const unreadSeen = new Set();
  for (const ln of unread) {
    const toks = nameTokens(lineNamePart(ln));
    const key = toks.join(" ");
    if (!key || unreadSeen.has(key)) continue;
    unreadSeen.add(key);
    if (readTokens.some((rt) => tokenScore(toks, rt) >= 0.5)) continue;
    unreadFiltered.push(ln);
  }

  // the weights are still raw here, so the passes are directly comparable
  const deduped = dropPassDuplicates(codes);

  // and the draft is handed over in the order the paper prints it, so it can
  // be checked line against line without hunting
  deduped.sort((a, b) => a.order - b.order);

  // every separator printed anywhere on the page proves the convention
  const evidence = [
    ...separatorEvidence(searchText),
    ...(geo?.evidence || []),
    ...(geo?.rows || []).flatMap((r) => separatorEvidence(`${r.qty} ${r.delivered || ""}`)),
  ];
  const qtyDecimals = fixQuantities(deduped, evidence);

  return {
    branch,
    branchRaw,
    docNo,
    transferNo,
    codes: deduped,
    qtyDecimals,
    hasColumns: !!geo?.hasColumns,
    unread: unreadFiltered,
    lines: textLines,
  };
}
