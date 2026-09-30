#!/usr/bin/env node
/* scripts/move-module.js — move a group of folders/files into a company
   module and rewrite every relative import in src/ that points into, or out
   of, the moved files. Files are moved with `git mv` so history follows.

   Usage: node scripts/move-module.js <plan.json> [--dry]
   plan.json: [["src/old/dir", "src/companies/x/new"], ["src/a.js", "src/companies/x/b.js"], …]

   Import rewriting keeps each import's style: a specifier written without
   an extension stays without one; one that named a folder (index file) keeps
   naming the folder when the file is still an index, else names the file. */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const [planFile, flag] = process.argv.slice(2);
const DRY = flag === "--dry";
const plan = JSON.parse(fs.readFileSync(planFile, "utf8"));
const EXT = [".js", ".jsx", ".json", ".ts", ".tsx"];
const SRC_EXT = /\.(jsx?|tsx?)$/;
const SPEC = /((?:\bfrom\s*|\bimport\s*\(?\s*|\brequire\s*\(\s*)["'])(\.{1,2}\/[^"'\n]*)(["'])/g;

const abs = (p) => path.resolve(ROOT, p);
function walk(dir, out) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === "node_modules" || e.name.startsWith(".")) continue;
    const p = path.join(dir, e.name);
    e.isDirectory() ? walk(p, out) : out.push(p);
  }
  return out;
}

// 1) old → new for every moved file
const moves = new Map();
for (const [from, to] of plan) {
  const A = abs(from), B = abs(to);
  if (fs.statSync(A).isDirectory()) {
    for (const f of walk(A, [])) moves.set(f, path.join(B, path.relative(A, f)));
  } else moves.set(A, B);
}
const newOf = (p) => moves.get(p) || p;

// 2) resolve an import against the OLD layout
const isFile = (p) => fs.existsSync(p) && fs.statSync(p).isFile();
function resolveOld(fromFile, spec) {
  const base = path.resolve(path.dirname(fromFile), spec);
  if (isFile(base)) return { file: base, kind: "exact" };
  for (const x of EXT) if (isFile(base + x)) return { file: base + x, kind: "noext" };
  for (const x of EXT) if (isFile(path.join(base, "index" + x))) return { file: path.join(base, "index" + x), kind: "dir" };
  return null;
}
function specFor(fromNew, targetNew, kind) {
  let t = targetNew;
  if (kind === "dir" && /^index\.[jt]sx?$/.test(path.basename(t))) t = path.dirname(t);
  else if (kind === "noext" || kind === "dir") t = t.replace(/\.(jsx?|tsx?|json)$/, "");
  let r = path.relative(path.dirname(fromNew), t).split(path.sep).join("/");
  if (!r.startsWith(".")) r = "./" + r;
  return r;
}

// 3) rewrite every source file that touches a moved file
const all = walk(abs("src"), []).filter((f) => SRC_EXT.test(f));
let changedFiles = 0, changedSpecs = 0;
const newContent = new Map();
for (const f of all) {
  const src = fs.readFileSync(f, "utf8");
  const fNew = newOf(f);
  const out = src.replace(SPEC, (m, pre, spec, post) => {
    const r = resolveOld(f, spec);
    if (!r) return m; // unresolved before the move — left as is (check-imports reports it)
    if (!moves.has(f) && !moves.has(r.file)) return m;
    const next = specFor(fNew, newOf(r.file), r.kind);
    if (next === spec) return m;
    changedSpecs++;
    return pre + next + post;
  });
  if (out !== src) { changedFiles++; newContent.set(f, out); }
}

console.log(`${moves.size} files to move · ${changedSpecs} imports to rewrite in ${changedFiles} files${DRY ? " (dry run)" : ""}`);
if (DRY) {
  for (const [f, c] of newContent) {
    const before = fs.readFileSync(f, "utf8").match(SPEC) || [];
    const after = c.match(SPEC) || [];
    before.forEach((b, i) => { if (b !== after[i]) console.log(`  ${path.relative(ROOT, f)}: ${b.replace(/^.*?["']/, "").slice(0, -1)} → ${after[i].replace(/^.*?["']/, "").slice(0, -1)}`); });
  }
  process.exit(0);
}

// 4) write rewritten contents (at the old paths), then git mv
for (const [f, c] of newContent) fs.writeFileSync(f, c);
for (const [from, to] of moves) {
  fs.mkdirSync(path.dirname(to), { recursive: true });
  execFileSync("git", ["mv", path.relative(ROOT, from), path.relative(ROOT, to)], { cwd: ROOT });
}
// remove now-empty source folders
for (const [from] of plan) {
  const A = abs(from);
  if (fs.existsSync(A) && fs.statSync(A).isDirectory()) fs.rmSync(A, { recursive: true, force: true });
}
console.log("done");
