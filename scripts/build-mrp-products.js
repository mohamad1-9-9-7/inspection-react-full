// scripts/build-mrp-products.js
//
// يحوّل Product.xlsx (بجذر المشروع) إلى public/data/mrp_products.json —
// مصدر قائمة المنتجات الوحيد لصفحة «الأصناف والمواد» بوحدة التصنيع.
//
// الأعمدة المتوقعة بالشيت الأول: SKU · ITEM · UoM · Type(الفئة)
//
// التشغيل:  node scripts/build-mrp-products.js

const path = require("path");
const fs = require("fs");
const XLSX = require("xlsx");

const ROOT = path.join(__dirname, "..");
const SRC = path.join(ROOT, "Product.xlsx");
const OUT = path.join(ROOT, "public", "data", "mrp_products.json");

const wb = XLSX.readFile(SRC);
const ws = wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils
  .sheet_to_json(ws, { header: 1, defval: "" })
  .slice(1) // سطر العناوين
  .filter((r) => String(r[0]).trim() !== "");

const out = rows.map((r) => {
  const code = String(r[0]).trim();
  const item = String(r[1]).trim();
  const uom = String(r[2]).trim().toUpperCase();
  const category = String(r[3]).trim();
  // "[20043] AUS CHIL LAMB SHANK BONELESS - KG" → اسم نظيف بلا كود وبلا لاحقة الوحدة
  let name = item.replace(/^\[[^\]]*\]\s*/, "");
  name = name.replace(/\s*-\s*[A-Za-z]+\s*$/, "").trim();
  return { item_code: code, description: name || code, uom: uom || "KG", category };
});

// الكود ماستر — أي تكرار بالملف بيوقف التوليد حتى ينصلح المصدر
const seen = new Map();
const dups = [];
out.forEach((o) => {
  const k = o.item_code.toUpperCase();
  if (seen.has(k)) dups.push(o.item_code);
  seen.set(k, true);
});
if (dups.length) {
  console.error("✖ أكواد مكرّرة في Product.xlsx:", [...new Set(dups)].join(", "));
  process.exit(1);
}

fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + "\n", "utf8");
console.log(`✔ ${out.length} منتج → ${path.relative(ROOT, OUT)}`);
console.log("الفئات:", [...new Set(out.map((o) => o.category))].join(", ") || "—");
