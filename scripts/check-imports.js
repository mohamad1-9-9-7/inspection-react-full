#!/usr/bin/env node
/* scripts/check-imports.js
   Every relative import under src/ must point at a real file, spelled with
   the exact upper/lower case of the file on disk.

   Why a script: the full CRA build runs out of memory on the dev machine,
   so moves and splits are gated with this + ESLint instead. And Windows
   forgives case mistakes ("./Foo" for "foo.jsx") that the Linux build
   server (Netlify) does not — this catches them before a deploy fails.

   Usage:  node scripts/check-imports.js [dir ...]    (default: src)
   Exit 1 when anything is unresolved.                                    */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const dirs = process.argv.slice(2).length ? process.argv.slice(2) : ["src"];
const EXT = [".js", ".jsx", ".json", ".ts", ".tsx"];
const SRC_EXT = /\.(jsx?|tsx?)$/;
// import x from "…" · export … from "…" · import "…" · import("…") · require("…")
const SPEC = /(?:\bfrom\s*|\bimport\s*\(?\s*|\brequire\s*\(\s*)["'](\.{1,2}\/[^"'\n]*)["']/g;

function walk(dir, out) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === "node_modules" || e.name.startsWith(".")) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (SRC_EXT.test(e.name)) out.push(p);
  }
  return out;
}

/* Exact-case existence: every segment must match a real directory entry. */
const listing = new Map();
function entries(dir) {
  if (!listing.has(dir)) {
    try { listing.set(dir, new Set(fs.readdirSync(dir))); } catch { listing.set(dir, null); }
  }
  return listing.get(dir);
}
function existsExact(abs) {
  const rel = path.relative(ROOT, abs);
  if (rel.startsWith("..")) return fs.existsSync(abs);
  let cur = ROOT;
  for (const seg of rel.split(path.sep)) {
    const e = entries(cur);
    if (!e || !e.has(seg)) return false;
    cur = path.join(cur, seg);
  }
  return true;
}
const isFile = (p) => existsExact(p) && fs.statSync(p).isFile();

function resolve(fromFile, spec) {
  const base = path.resolve(path.dirname(fromFile), spec.split("?")[0]);
  if (isFile(base)) return base;
  for (const x of EXT) if (isFile(base + x)) return base + x;
  for (const x of EXT) if (isFile(path.join(base, "index" + x))) return path.join(base, "index" + x);
  return null;
}

function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
}

/* Company boundaries, checked on the RESOLVED path (a relative "../../x"
   says nothing about which company it lands in):
     • src/companies/<A>/… may not import src/companies/<B>/… (B ≠ A);
     • src/core/… may not import anything under src/companies/.
   The registry files at the root of src/companies/ are the one place that
   knows every company, so they are exempt. */
const rel = (p) => path.relative(ROOT, p).split(path.sep).join("/");
const companyOf = (r) => (/^src\/companies\/([^/]+)\//.exec(r) || [])[1] || null;
const inCore = (r) => r.startsWith("src/core/");

const files = dirs.flatMap((d) => walk(path.resolve(ROOT, d), []));
const bad = [];
const crossings = [];
for (const f of files) {
  const src = stripComments(fs.readFileSync(f, "utf8"));
  const from = rel(f);
  let m;
  SPEC.lastIndex = 0;
  while ((m = SPEC.exec(src))) {
    const target = resolve(f, m[1]);
    if (!target) { bad.push(`${from}  →  ${m[1]}`); continue; }
    const to = rel(target);
    const a = companyOf(from);
    const b = companyOf(to);
    if (a && b && a !== b) crossings.push(`${from}  →  ${to}   (company "${a}" reaching into "${b}")`);
    if (inCore(from) && to.startsWith("src/companies/")) crossings.push(`${from}  →  ${to}   (core must not depend on a company)`);
  }
}

let failed = false;
if (bad.length) {
  console.error(`✗ ${bad.length} unresolved import(s) in ${files.length} files:\n  ` + bad.join("\n  "));
  failed = true;
}
if (crossings.length) {
  console.error(`✗ ${crossings.length} company-boundary violation(s):\n  ` + crossings.join("\n  "));
  failed = true;
}
if (failed) process.exit(1);
console.log(`✓ imports: ${files.length} files, every relative import resolves (exact case), no company crosses into another`);
