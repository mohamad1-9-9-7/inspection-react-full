// src/pages/settings/_shared/backupPhotos.js
// 📷 الصور جوّا النسخة الاحتياطية (Al Mawashi).
//
// قبل: كل صورة رابط Cloudinary بس — لو انحذف الحساب أو انقطع النت، النسخة
// بلا صور. هلق لكل ملف Excel فيه صور:
//   • مجلد جنبه `<اسم الملف>_photos/` فيه الصور نفسها (حجم مضبوط 1600px).
//   • ورقة «Photos» جوّا الملف: سطر لكل صورة — التاريخ، المرجع، مكان الصورة
//     بالتقرير، صورة مصغّرة مضمّنة، ورابط للملف المحلي ورابط أونلاين.
//   • كل خلية بالأوراق الأصلية فيها رابط صورة صارت تفتح النسخة المحلية.
//
// الصور بتنزل من Cloudinary مباشرة (بيسمح CORS)، أربعة بنفس الوقت، وبتحترم
// زر الإلغاء. صورة ما نزلت ما بتوقّف النسخة — بيضل رابطها الأونلاين.

import { COLORS, BORDER_BLACK, fillSolid, center, left, sanitizeSheetName } from "../excel-exporters/_lib";

const URL_RE = /^https?:\/\/\S+$/i;
const IMG_EXT = /\.(jpe?g|png|gif|webp|heic|heif|bmp)(\?|#|$)/i;
const PDF_EXT = /\.pdf(\?|#|$)/i;

/** الصورة/الملف المرفق اللي بيستاهل ينحفظ: Cloudinary أو امتداد صورة/PDF. */
function isEvidenceUrl(u) {
  if (!URL_RE.test(u)) return false;
  if (/res\.cloudinary\.com\//i.test(u)) return true;
  return IMG_EXT.test(u) || PDF_EXT.test(u);
}
function isPdf(u) {
  return PDF_EXT.test(u) || /\/raw\/upload\//i.test(u);
}

/** Cloudinary transformation بعد /upload/ — مثلاً حجم أصغر وصيغة jpg. */
function cloudinaryVariant(url, transform) {
  if (!/res\.cloudinary\.com\/.+\/image\/upload\//i.test(url)) return url;
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

/**
 * نزّل صور مجموعة سجلات وحطّها بالـZIP.
 *
 * @param {object[]} records
 * @param {object} opts
 * @param {object} opts.zipFolder   مجلد JSZip اللي فيه ملف الـExcel
 * @param {string} opts.dirName     اسم مجلد الصور (بلا مسافات — روابط Excel النسبية)
 * @param {(rec)=>string} opts.dateOf
 * @param {(rec)=>string} opts.refOf
 * @param {AbortSignal} [opts.signal]
 * @param {(done:number,total:number)=>void} [opts.onProgress]
 * @returns {Promise<{entries: object[], localByUrl: Map<string,string>, failed: number}>}
 */
export async function downloadRecordPhotos(records, opts) {
  const { zipFolder, dirName, dateOf, refOf, signal, onProgress } = opts;
  const jobs = [];
  records.forEach((rec) => {
    const date = dateOf(rec) || "no-date";
    const ref = refOf(rec) || String(rec?.id ?? "");
    collectPhotoUrls(rec).forEach((p, i) => jobs.push({ ...p, date, ref, n: i + 1, idx: jobs.length }));
  });
  const entries = [];
  const localByUrl = new Map();
  if (!jobs.length) return { entries, localByUrl, failed: 0 };

  const dir = zipFolder.folder(dirName);
  let done = 0;
  let failed = 0;
  await pool(jobs, 4, async (job) => {
    const pdf = isPdf(job.url);
    const ext = pdf ? "pdf" : "jpg";
    const fileName = `${safeName(job.date)}_${safeName(job.ref) || "rec"}_${String(job.n).padStart(2, "0")}.${ext}`;
    const full = await fetchBytes(pdf ? job.url : cloudinaryVariant(job.url, "c_limit,w_1600,q_auto,f_jpg"), signal);
    let thumb = null;
    if (full && !pdf) {
      thumb = /res\.cloudinary\.com/i.test(job.url)
        ? await fetchBytes(cloudinaryVariant(job.url, "c_fill,w_220,h_165,q_auto,f_jpg"), signal)
        : null;
    }
    if (full) {
      dir.file(fileName, full);
      localByUrl.set(job.url, `${dirName}/${fileName}`);
    } else {
      failed++;
    }
    entries.push({ ...job, fileName: full ? fileName : "", local: full ? `${dirName}/${fileName}` : "", thumb, pdf });
    done++;
    onProgress?.(done, jobs.length);
  });

  // نفس ترتيب السجلات والصور، مش ترتيب انتهاء التنزيل — عمود «📷 Photos»
  // بالسجل بيأشّر على رقم السطر هون.
  entries.sort((a, b) => a.idx - b.idx);
  return { entries, localByUrl, failed };
}

/**
 * ورقة «Photos»: سطر لكل صورة مع صورة مصغّرة مضمّنة ورابط للملف المحلي.
 * لازم تنضاف قبل `wb.xlsx.writeBuffer`.
 */
export function addPhotosSheet(wb, entries, title = "Photos") {
  if (!entries.length) return;
  const ws = wb.addWorksheet(sanitizeSheetName(title), { views: [{ state: "frozen", ySplit: 2, showGridLines: false }] });
  ws.columns = [
    { width: 6 }, { width: 13 }, { width: 18 }, { width: 30 }, { width: 32 }, { width: 34 }, { width: 14 },
  ];
  ws.mergeCells(1, 1, 1, 7);
  const t = ws.getCell(1, 1);
  t.value = `📷 ${entries.length} photo(s) — local copies sit in the folder next to this file`;
  t.font = { bold: true, size: 12, color: { argb: COLORS.NAVY } };
  t.fill = fillSolid(COLORS.SKY_LIGHT);
  t.alignment = { ...left, indent: 1 };
  ws.getRow(1).height = 24;

  const heads = ["#", "Date", "Ref / ID", "Where in the report", "Photo", "Local file", "Online"];
  heads.forEach((h, i) => {
    const c = ws.getCell(2, i + 1);
    c.value = h;
    c.font = { bold: true, color: { argb: COLORS.WHITE }, size: 10 };
    c.fill = fillSolid(COLORS.NAVY);
    c.alignment = center;
    c.border = BORDER_BLACK;
  });
  ws.getRow(2).height = 24;

  entries.forEach((e, i) => {
    const r = i + 3;
    const vals = [i + 1, e.date, e.ref, e.field.replace(/\./g, " › "), "", "", ""];
    vals.forEach((v, ci) => {
      const c = ws.getCell(r, ci + 1);
      c.value = v;
      c.border = BORDER_BLACK;
      c.alignment = ci === 3 ? { ...left, wrapText: true } : center;
      c.font = { size: 10 };
    });
    const local = ws.getCell(r, 6);
    if (e.local) {
      local.value = { text: e.fileName, hyperlink: e.local };
      local.font = { size: 10, color: { argb: "1D4ED8" }, underline: true };
    } else {
      local.value = "⚠️ not downloaded";
      local.font = { size: 10, color: { argb: COLORS.RED } };
    }
    const online = ws.getCell(r, 7);
    online.value = { text: "open", hyperlink: e.url };
    online.font = { size: 10, color: { argb: "1D4ED8" }, underline: true };

    if (e.thumb) {
      try {
        const id = wb.addImage({ buffer: e.thumb, extension: "jpeg" });
        ws.addImage(id, { tl: { col: 4 + 0.08, row: r - 1 + 0.08 }, ext: { width: 160, height: 120 }, editAs: "oneCell" });
        ws.getRow(r).height = 96;
      } catch {
        ws.getCell(r, 5).value = e.pdf ? "PDF" : "—";
      }
    } else {
      ws.getCell(r, 5).value = e.pdf ? "📄 PDF" : "—";
      ws.getRow(r).height = 20;
    }
  });
  ws.autoFilter = { from: { row: 2, column: 1 }, to: { row: entries.length + 2, column: 4 } };
}

/**
 * بعد التنزيل: كل خلية رابطها صورة نزلت بتصير تفتح النسخة المحلية (نسبي
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
