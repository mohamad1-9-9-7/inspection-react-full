// src/pages/settings/_shared/backupPhotos.js
// 📷 الصور جوّا النسخة الاحتياطية (Al Mawashi).
//
// أربع طرق (PHOTO_MODES) بيختار منها المستخدم:
//   links       — رابط Cloudinary بالخلية بس. الأخف.
//   embed_links — الصورة جوّا الإكسل، وبتفتح الأصلية لما تكبس عليها.
//   embed_only  — الصورة جوّا الإكسل وكل روابط Cloudinary منشالة: ملف كامل
//                 لحاله لمدقق خارجي، بيفتح بلا نت وبلا روابط للسيرفر.
//   folder      — الصور ملفات بمجلد `<الملف>_photos/` جنب الإكسل، والخلية
//                 بتفتح النسخة المحلية.
// وثلاث جودات (PHOTO_QUALITY): صغيرة / متوسطة / أصلية.
//
// التقارير اللي إلها عمود صور (التدقيق الداخلي، البلدية) بتحط الصورة بالخلية
// نفسها؛ الباقي بياخد ورقة «Photos» فيها الصور. الصور بتنزل من Cloudinary
// مباشرة (بيسمح CORS)، أربعة بنفس الوقت، وبتحترم زر الإلغاء. صورة ما نزلت ما
// بتوقّف النسخة.

import { COLORS, BORDER_BLACK, fillSolid, center, left, sanitizeSheetName } from "../excel-exporters/_lib";

export const PHOTO_MODES = [
  { id: "links",       label: "روابط فقط",    icon: "🔗", hint: "الأخف والأسرع — للأرشيف اليومي" },
  { id: "embed_links", label: "صور + روابط",  icon: "🖼️", hint: "الصورة بالملف وبتفتح الأصلية بكبسة" },
  { id: "embed_only",  label: "صور فقط",      icon: "🛡️", hint: "بلا أي رابط — لمدقق خارجي، بيفتح بلا نت" },
  { id: "folder",      label: "مجلد صور",     icon: "📁", hint: "الصور ملفات جنب الإكسل — أرشيف كامل" },
];

/* `mb` = rough average size of one photo at this quality, for the estimate. */
export const PHOTO_QUALITY = [
  { id: "small",    label: "صغيرة",  hint: "400px", transform: "c_limit,w_400,q_auto,f_jpg",  mb: 0.04 },
  { id: "medium",   label: "متوسطة", hint: "800px", transform: "c_limit,w_800,q_auto,f_jpg",  mb: 0.12 },
  { id: "original", label: "أصلية",  hint: "بحجمها", transform: "q_auto:best,f_jpg",           mb: 0.9 },
];
const THUMB = "c_fill,w_220,h_165,q_auto,f_jpg";
const THUMB_MB = 0.012;

export const photoModeById = (id) => PHOTO_MODES.find((m) => m.id === id) || PHOTO_MODES[0];
export const photoQualityById = (id) => PHOTO_QUALITY.find((q) => q.id === id) || PHOTO_QUALITY[1];

const URL_RE = /^https?:\/\/\S+$/i;
const IMG_EXT = /\.(jpe?g|png|gif|webp|heic|heif|bmp)(\?|#|$)/i;
const PDF_EXT = /\.pdf(\?|#|$)/i;
const CLOUD_IMG = /res\.cloudinary\.com\/.+\/image\/upload\//i;

/** الصورة/الملف المرفق اللي بيستاهل ينحفظ: Cloudinary أو امتداد صورة/PDF. */
export function isEvidenceUrl(u) {
  if (!URL_RE.test(u)) return false;
  if (/res\.cloudinary\.com\//i.test(u)) return true;
  return IMG_EXT.test(u) || PDF_EXT.test(u);
}
function isPdf(u) {
  return PDF_EXT.test(u) || /\/raw\/upload\//i.test(u);
}

/** Cloudinary transformation بعد /upload/ — حجم وصيغة jpg. */
function cloudinaryVariant(url, transform) {
  if (!CLOUD_IMG.test(url)) return url;
  return url.replace(/\/image\/upload\//i, `/image/upload/${transform}/`);
}

/**
 * كل روابط الصور بسجل واحد، مع مكانها بالـpayload («rows.3.evidenceImgs»).
 * @returns {{url:string, field:string}[]}
 */
export function collectPhotoUrls(record) {
  const out = [];
  const seen = new Set();
  const walk = (v, path, depth) => {
    if (depth > 8 || v == null) return;
    if (typeof v === "string") {
      const s = v.trim();
      if (isEvidenceUrl(s) && !seen.has(s)) { seen.add(s); out.push({ url: s, field: path }); }
      return;
    }
    if (Array.isArray(v)) { v.forEach((x, i) => walk(x, `${path}.${i + 1}`, depth + 1)); return; }
    if (typeof v === "object") {
      for (const [k, x] of Object.entries(v)) {
        if (k === "_outboxId") continue;
        walk(x, path ? `${path}.${k}` : k, depth + 1);
      }
    }
  };
  walk(record?.payload || {}, "", 0);
  return out;
}

/**
 * الحجم المتوقّع بالميغا لعدد صور بطريقة وجودة معيّنة.
 * `sheetThumbs` = التقارير اللي صورها بورقة Photos (بتاخد مصغّرة كمان بوضع المجلد).
 */
export function estimatePhotoMB(count, mode, quality, { sheetThumbs = 0 } = {}) {
  if (mode === "links" || !count) return 0;
  const q = photoQualityById(quality);
  const thumbs = mode === "folder" ? sheetThumbs * THUMB_MB : 0;
  return count * q.mb + thumbs;
}

async function fetchBytes(url, signal) {
  try {
    const res = await fetch(url, { signal, cache: "force-cache", mode: "cors" });
    if (!res.ok) return null;
    return new Uint8Array(await res.arrayBuffer());
  } catch (e) {
    if (e?.name === "AbortError") throw e;
    return null;
  }
}

/** شغّل المهام بعدد محدود بنفس الوقت. */
async function pool(items, size, fn) {
  let i = 0;
  const workers = Array.from({ length: Math.min(size, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      await fn(items[idx], idx);
    }
  });
  await Promise.all(workers);
}

const safeName = (s) =>
  String(s || "").replace(/[\\/:*?"<>|\s]+/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "").slice(0, 60);

/** Image bytes Excel can embed, at the chosen quality (null for PDF / webp…). */
async function embeddable(url, quality, signal) {
  if (isPdf(url)) return null;
  if (CLOUD_IMG.test(url)) {
    const bytes = await fetchBytes(cloudinaryVariant(url, photoQualityById(quality).transform), signal);
    return bytes && bytes.length ? { buffer: bytes, extension: "jpeg" } : null;
  }
  let extension = "";
  if (/\.png(\?|#|$)/i.test(url)) extension = "png";
  else if (/\.jpe?g(\?|#|$)/i.test(url)) extension = "jpeg";
  if (!extension) return null; // Excel cannot show webp / heic
  const bytes = await fetchBytes(url, signal);
  return bytes && bytes.length ? { buffer: bytes, extension } : null;
}

/**
 * نزّل صور مجموعة سجلات.
 *
 * mode "folder": كل صورة بتنحفظ ملف بالـZIP (بالجودة المختارة) + مصغّرة للورقة.
 * mode embed_*:  الصورة نفسها (بالجودة المختارة) بتنضمّن بورقة Photos — بلا ملفات.
 *
 * @param {object[]} records
 * @param {object} opts
 * @param {string} opts.mode
 * @param {string} opts.quality
 * @param {object} [opts.zipFolder]  مجلد JSZip اللي فيه ملف الـExcel (mode folder)
 * @param {string} [opts.dirName]    اسم مجلد الصور (بلا مسافات — روابط Excel النسبية)
 * @param {(rec)=>string} opts.dateOf
 * @param {(rec)=>string} opts.refOf
 * @param {AbortSignal} [opts.signal]
 * @param {(done:number,total:number)=>void} [opts.onProgress]
 * @returns {Promise<{entries: object[], localByUrl: Map<string,string>, failed: number}>}
 */
export async function downloadRecordPhotos(records, opts) {
  const { mode, quality, zipFolder, dirName, dateOf, refOf, signal, onProgress } = opts;
  const jobs = [];
  records.forEach((rec) => {
    const date = dateOf(rec) || "no-date";
    const ref = refOf(rec) || String(rec?.id ?? "");
    collectPhotoUrls(rec).forEach((p, i) => jobs.push({ ...p, date, ref, n: i + 1, idx: jobs.length }));
  });
  const entries = [];
  const localByUrl = new Map();
  if (!jobs.length) return { entries, localByUrl, failed: 0 };

  const toFolder = mode === "folder" && zipFolder;
  const dir = toFolder ? zipFolder.folder(dirName) : null;
  let done = 0;
  let failed = 0;
  await pool(jobs, 4, async (job) => {
    const pdf = isPdf(job.url);
    let fileName = "";
    let local = "";
    let thumb = null;
    if (toFolder) {
      const ext = pdf ? "pdf" : "jpg";
      const name = `${safeName(job.date)}_${safeName(job.ref) || "rec"}_${String(job.n).padStart(2, "0")}.${ext}`;
      const full = await fetchBytes(pdf ? job.url : cloudinaryVariant(job.url, photoQualityById(quality).transform), signal);
      if (full) {
        dir.file(name, full);
        fileName = name;
        local = `${dirName}/${name}`;
        localByUrl.set(job.url, local);
        if (!pdf && CLOUD_IMG.test(job.url)) {
          const t = await fetchBytes(cloudinaryVariant(job.url, THUMB), signal);
          thumb = t ? { buffer: t, extension: "jpeg" } : null;
        }
      } else {
        failed++;
      }
    } else {
      thumb = await embeddable(job.url, quality, signal);
      if (!thumb && !pdf) failed++;
    }
    entries.push({ ...job, fileName, local, thumb, pdf });
    done++;
    onProgress?.(done, jobs.length);
  });

  // نفس ترتيب السجلات والصور، مش ترتيب انتهاء التنزيل — عمود «📷 Photos»
  // بالسجل بيأشّر على رقم السطر هون.
  entries.sort((a, b) => a.idx - b.idx);
  return { entries, localByUrl, failed };
}

/**
 * صور للتضمين جوّا خلايا الإكسل (التقارير اللي إلها عمود صور)، بالجودة
 * المختارة. صورة مش من Cloudinary بتنضمّن بس إذا jpg/png. PDF ما بينضمّن.
 * @returns {Promise<Map<string, {buffer: Uint8Array, extension: string}>>}
 */
export async function fetchEmbeddableImages(urls, { quality = "medium", signal, onProgress } = {}) {
  const list = [...new Set(urls)].filter((u) => !isPdf(u));
  const out = new Map();
  let done = 0;
  await pool(list, 4, async (u) => {
    const img = await embeddable(u, quality, signal);
    if (img) out.set(u, img);
    done++;
    onProgress?.(done, list.length);
  });
  return out;
}

/**
 * ورقة «Photos»: سطر لكل صورة مع الصورة مضمّنة.
 * showLocal: عمود الملف المحلي (وضع المجلد). showOnline: عمود الرابط الأونلاين
 * (مش بوضع «صور فقط»). لازم تنضاف قبل `wb.xlsx.writeBuffer`.
 */
export function addPhotosSheet(wb, entries, { showLocal = false, showOnline = true, title = "Photos" } = {}) {
  if (!entries.length) return;
  const cols = [
    ["#", 6], ["Date", 13], ["Ref / ID", 18], ["Where in the report", 30], ["Photo", 32],
    ...(showLocal ? [["Local file", 34]] : []),
    ...(showOnline ? [["Online", 14]] : []),
  ];
  const NC = cols.length;
  const ws = wb.addWorksheet(sanitizeSheetName(title), { views: [{ state: "frozen", ySplit: 2, showGridLines: false }] });
  ws.columns = cols.map(([, w]) => ({ width: w }));
  ws.mergeCells(1, 1, 1, NC);
  const t = ws.getCell(1, 1);
  t.value = showLocal
    ? `📷 ${entries.length} photo(s) — full copies sit in the folder next to this file`
    : `📷 ${entries.length} photo(s)`;
  t.font = { bold: true, size: 12, color: { argb: COLORS.NAVY } };
  t.fill = fillSolid(COLORS.SKY_LIGHT);
  t.alignment = { ...left, indent: 1 };
  ws.getRow(1).height = 24;

  cols.forEach(([h], i) => {
    const c = ws.getCell(2, i + 1);
    c.value = h;
    c.font = { bold: true, color: { argb: COLORS.WHITE }, size: 10 };
    c.fill = fillSolid(COLORS.NAVY);
    c.alignment = center;
    c.border = BORDER_BLACK;
  });
  ws.getRow(2).height = 24;

  const localCol = showLocal ? 6 : 0;
  const onlineCol = showOnline ? (showLocal ? 7 : 6) : 0;
  entries.forEach((e, i) => {
    const r = i + 3;
    const vals = [i + 1, e.date, e.ref, e.field.replace(/\./g, " › ")];
    for (let ci = 0; ci < NC; ci++) {
      const c = ws.getCell(r, ci + 1);
      c.value = ci < vals.length ? vals[ci] : "";
      c.border = BORDER_BLACK;
      c.alignment = ci === 3 ? { ...left, wrapText: true } : center;
      c.font = { size: 10 };
    }
    if (localCol) {
      const local = ws.getCell(r, localCol);
      if (e.local) {
        local.value = { text: e.fileName, hyperlink: e.local };
        local.font = { size: 10, color: { argb: "1D4ED8" }, underline: true };
      } else {
        local.value = "⚠️ not downloaded";
        local.font = { size: 10, color: { argb: COLORS.RED } };
      }
    }
    if (onlineCol) {
      const online = ws.getCell(r, onlineCol);
      online.value = { text: "open", hyperlink: e.url };
      online.font = { size: 10, color: { argb: "1D4ED8" }, underline: true };
    }

    if (e.thumb) {
      try {
        const id = wb.addImage({ buffer: e.thumb.buffer || e.thumb, extension: e.thumb.extension || "jpeg" });
        ws.addImage(id, { tl: { col: 4 + 0.08, row: r - 1 + 0.08 }, ext: { width: 200, height: 150 }, editAs: "oneCell" });
        ws.getRow(r).height = 120;
      } catch {
        ws.getCell(r, 5).value = e.pdf ? "PDF" : "—";
      }
    } else {
      ws.getCell(r, 5).value = e.pdf ? "📄 PDF" : "⚠️ not available";
      ws.getRow(r).height = 20;
    }
  });
  ws.autoFilter = { from: { row: 2, column: 1 }, to: { row: entries.length + 2, column: 4 } };
}

/**
 * وضع المجلد: كل خلية رابطها صورة نزلت بتصير تفتح النسخة المحلية (نسبي
 * للملف)، والنص بيضل نفسه. منشغّلها بعد linkifySheet.
 */
export function relinkToLocal(wb, localByUrl) {
  if (!localByUrl.size) return;
  wb.worksheets.forEach((ws) => {
    if (ws.name === "Photos") return;
    try {
      ws.eachRow({ includeEmpty: false }, (row) => {
        row.eachCell({ includeEmpty: false }, (cell) => {
          const v = cell.value;
          const link = v && typeof v === "object" ? v.hyperlink : null;
          if (link && localByUrl.has(link)) cell.value = { ...v, hyperlink: localByUrl.get(link) };
        });
      });
    } catch { /* cosmetics */ }
  });
}

const EVIDENCE_IN_TEXT = /https?:\/\/res\.cloudinary\.com\/\S+/gi;

/**
 * وضع «صور فقط»: ولا رابط Cloudinary بيضل بالملف — لا خلية رابط ولا نص فيه
 * رابط. مكانه 📷 (الصورة نفسها بالعمود أو بورقة Photos).
 */
export function stripEvidenceLinks(wb) {
  wb.worksheets.forEach((ws) => {
    try {
      ws.eachRow({ includeEmpty: false }, (row) => {
        row.eachCell({ includeEmpty: false }, (cell) => {
          const v = cell.value;
          if (v && typeof v === "object" && typeof v.hyperlink === "string") {
            if (/res\.cloudinary\.com\//i.test(v.hyperlink)) {
              const text = String(v.text || "").replace(EVIDENCE_IN_TEXT, "📷").trim();
              cell.value = text || "📷";
              cell.font = { ...(cell.font || {}), underline: false, color: { argb: COLORS.TEXT } };
            }
            return;
          }
          if (typeof v === "string" && /res\.cloudinary\.com\//i.test(v)) {
            cell.value = v.replace(EVIDENCE_IN_TEXT, "📷");
          }
        });
      });
    } catch { /* cosmetics */ }
  });
}
