// src/pages/settings/_shared/backupTree.js
// 🗂️ Turns the report-type catalog into the folder tree of a backup ZIP.
//
// The rule the whole backup follows: opening the ZIP should feel like opening
// the app. One folder per dashboard card, one folder per branch inside it, one
// folder per on-screen group inside that, and one Excel file per report type —
// all numbered so the listing keeps the order the screens use instead of
// falling into alphabetical order, where "POS 6" lands after "POS 19".
//
//   02 Daily Monitor/08 POS 19/01 Temperature & CCP/01 Temperature Monitoring Log.xlsx
//
// Both the Excel backup and the blank-forms export build their paths here, so
// the two ZIPs are always laid out identically.

import { BRANCHES, folderSegmentsFor, fileIndexFor, cardById } from "../reportTypeCatalog";

/* JSZip treats "/" inside a name as a folder separator, so a label like
   "F-13/F-18 Equipment Maintenance" used to silently split into a phantom
   sub-folder. Flatten every path separator — and the characters Windows
   refuses — before a label becomes part of a path. */
export function safeSegment(label) {
  return String(label || "report")
    .replace(/[/\\]/g, "-")
    .replace(/[:*?"<>|]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\.+$/, "")          // Windows drops a trailing dot silently
    .slice(0, 110) || "report";
}

const pad2 = (n) => String(n).padStart(2, "0");

/**
 * Flatten the catalog into one work item per selected `branchId::typeKey`.
 *
 * A few types sit under two cards on purpose (the FTR pre-loading sheets are
 * entered at QCS and reviewed at the truck). Each placement gets its own file,
 * exactly as each placement has its own screen — the caller caches the fetch by
 * type so the duplicate costs no extra request.
 *
 * @param {Set<string>} picked  "branchId::typeKey" keys
 * @returns {Array<{branch, card, typeKey, typeLabel, segments: string[], fileBase: string, path: string}>}
 */
export function buildWorkList(picked) {
  const work = [];
  for (const branch of BRANCHES) {
    for (const [typeKey, typeLabel] of branch.types) {
      if (!picked.has(`${branch.id}::${typeKey}`)) continue;
      const segments = folderSegmentsFor(branch, typeKey).map(safeSegment);
      const fileBase = safeSegment(`${pad2(fileIndexFor(branch, typeKey))} ${typeLabel}`);
      work.push({
        branch,
        card: cardById(branch.card),
        typeKey,
        typeLabel,
        /* This placement's own group, not the catalog's first match for the
           slug — a type listed under two cards can sit in different groups. */
        group: branch.types.find(([t]) => t === typeKey)?.[2] || "",
        segments,
        fileBase,
        path: [...segments, fileBase].join("/"),
      });
    }
  }
  return work;
}

/**
 * Get (or create) the nested JSZip folder for a path, memoized so the same
 * folder object is reused. Folders are only created when a file actually lands
 * in them, which keeps empty branches out of the ZIP.
 */
export function folderFor(zip, segments, cache) {
  let node = zip;
  let key = "";
  for (const seg of segments) {
    key = key ? `${key}/${seg}` : seg;
    let next = cache.get(key);
    if (!next) {
      next = node.folder(seg);
      cache.set(key, next);
    }
    node = next;
  }
  return node;
}

/* ═══════════════════════════════════════════════════════════════
   MANIFEST
   ═══════════════════════════════════════════════════════════════ */

function csvCell(v) {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * The index sheet of the whole backup: every file that was written, what type
 * it holds, how many records, and the dates they span. Saved as CSV with a BOM
 * so Excel opens the Arabic column headers correctly on a double-click.
 */
export function manifestCsv(rows) {
  const head = [
    "Card", "Branch", "Group", "Report", "Type slug",
    "Records", "First date", "Last date", "Rendering", "File",
  ];
  const body = rows.map((r) => [
    r.card, r.branch, r.group || "", r.typeLabel, r.typeKey,
    r.count, r.firstDate || "", r.lastDate || "", r.kind, r.path,
  ]);
  return "﻿" + [head, ...body].map((line) => line.map(csvCell).join(",")).join("\r\n");
}

/** Plain-text README dropped at the ZIP root, in Arabic. */
export function readmeText({ generatedAt, filterLabel, rows, notes = [], brand = "Al Mawashi" }) {
  const totalRecords = rows.reduce((s, r) => s + (Number(r.count) || 0), 0);
  const byCard = new Map();
  for (const r of rows) byCard.set(r.card, (byCard.get(r.card) || 0) + 1);

  const lines = [
    `نسخة احتياطية — ${brand} QMS`,
    "=".repeat(60),
    "",
    `تاريخ الإنشاء : ${generatedAt}`,
    `المدة         : ${filterLabel}`,
    `عدد الملفات   : ${rows.length}`,
    `عدد السجلات   : ${totalRecords.toLocaleString("en-US")}`,
    "",
    "ترتيب المجلدات",
    "-".repeat(60),
    "كل مجلد رئيسي = كرت على الشاشة الرئيسية، وجوّاه مجلد لكل فرع أو قسم،",
    "وجوّا الفرع مجلد لكل مجموعة تقارير — نفس الترتيب اللي بتشوفه بالسيستم.",
    "الأرقام على أسماء المجلدات والملفات موجودة حتى يضلّ الترتيب صحيح؛ بدونها",
    "ويندوز بيرتّب أبجدي فبيحطّ POS 6 بعد POS 19.",
    "",
    "المحتوى",
    "-".repeat(60),
    ...[...byCard.entries()].map(([card, n]) => `  ${card} — ${n} ملف`),
    "",
    "ملف الفهرس",
    "-".repeat(60),
    "00 INDEX.csv فيه سطر لكل ملف: الكرت، الفرع، المجموعة، اسم التقرير،",
    "الـtype بقاعدة البيانات، عدد السجلات، أول وآخر تاريخ، وطريقة العرض.",
    "",
  ];
  if (notes.length) {
    lines.push("ملاحظات", "-".repeat(60), ...notes.map((n) => `  • ${n}`), "");
  }
  return lines.join("\r\n");
}

/** Same README, worded for the blank-forms ZIP. */
export function blankReadmeText({ generatedAt, rowCount, rows, missing = [], brand = "Al Mawashi" }) {
  const lines = [
    `نماذج فارغة للطباعة — ${brand} QMS`,
    "=".repeat(60),
    "",
    `تاريخ الإنشاء   : ${generatedAt}`,
    `عدد النماذج     : ${rows.length}`,
    `أسطر فارغة/نموذج: ${rowCount}`,
    "",
    "شو هالملفات",
    "-".repeat(60),
    "كل ملف هو نفس تقرير الإدخال بالضبط — نفس الترويسة ونفس الأعمدة ونفس",
    "أسئلة الشيك-لِست — بس بلا أي بيانات، جاهز للطباعة والتعبئة باليد.",
    "",
    "من وين جاي الشكل",
    "-".repeat(60),
    "النموذج مبني من أحدث سجل فعلي لنفس النوع بعد مسح الإجابات: بتضلّ",
    "العناوين وأسماء الغرف والأسئلة والوحدات والحدود، وبتنمسح القراءات",
    "والتواريخ والأسماء والتواقيع. هيك أي حقل جديد بينضاف على الشاشة",
    "بيطلع بالنموذج الفارغ لحالو.",
    "",
  ];
  if (missing.length) {
    lines.push(
      "نماذج بلا سجل يُبنى عليه",
      "-".repeat(60),
      "هالأنواع ما عندها ولا سجل محفوظ، فانبنت من هيكل عام. التقارير اللي",
      "أعمدتها مكتوبة بالكود طلعت مضبوطة، والباقي بدّو أول سجل حقيقي:",
      ...missing.map((m) => `  • ${m}`),
      ""
    );
  }
  return lines.join("\r\n");
}
