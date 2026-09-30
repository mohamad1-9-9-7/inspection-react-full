#!/usr/bin/env node
/* scripts/check-sizes.js
   Keeps files small enough to read and to change safely.

   • ENFORCED: every file under src/companies/ and src/core/ stays at or
     below MAX lines — the new, isolated structure starts clean and stays so.
   • REPORTED: the rest of src/ (the older code, split in later phases) is
     listed so progress can be tracked, but does not fail the check.

   Usage:  node scripts/check-sizes.js [--max 800] [--top 15]
   Exit 1 when an enforced file is over the limit.                          */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const arg = (name, def) => {
  const i = process.argv.indexOf(name);
  return i > -1 ? Number(process.argv[i + 1]) : def;
};
const MAX = arg("--max", 800);
const TOP = arg("--top", 15);
const ENFORCED = ["src/companies/", "src/core/"];
const SRC_EXT = /\.(jsx?|tsx?)$/;

function walk(dir, out) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === "node_modules" || e.name.startsWith(".")) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (SRC_EXT.test(e.name)) out.push(p);
  }
  return out;
}

const rows = walk(path.join(ROOT, "src"), []).map((f) => {
  const rel = path.relative(ROOT, f).split(path.sep).join("/");
  const lines = fs.readFileSync(f, "utf8").split("\n").length;
  return { rel, lines, enforced: ENFORCED.some((p) => rel.startsWith(p)) };
});

const offenders = rows.filter((r) => r.enforced && r.lines > MAX).sort((a, b) => b.lines - a.lines);
const legacy = rows.filter((r) => !r.enforced && r.lines > MAX).sort((a, b) => b.lines - a.lines);
const enforcedCount = rows.filter((r) => r.enforced).length;

console.log(`sizes: ${rows.length} files · limit ${MAX} lines`);
console.log(`  enforced (companies/, core/): ${enforcedCount} files, ${offenders.length} over the limit`);
console.log(`  older code (reported only):   ${legacy.length} files over the limit`);
if (legacy.length && TOP > 0) {
  console.log(`  largest older files:`);
  legacy.slice(0, TOP).forEach((r) => console.log(`    ${String(r.lines).padStart(6)}  ${r.rel}`));
}
if (offenders.length) {
  console.error(`✗ over ${MAX} lines in the isolated structure:\n` +
    offenders.map((r) => `    ${String(r.lines).padStart(6)}  ${r.rel}`).join("\n"));
  process.exit(1);
}
console.log(`✓ sizes: every file in companies/ and core/ is within ${MAX} lines`);
