#!/usr/bin/env node
/* scripts/use-central-api.js — replace a file's home-made API_BASE block
   with the one source of truth, src/config/api.js.

   Many screens copied their own "CRA + Vite + window" resolution of the
   server URL. It resolves to the same value as config/api.js (which checks
   a superset of the same settings, in the same spirit), but it duplicates
   code and uses import.meta, which Jest cannot parse — so those screens
   could not be tested.

   Per file: the top-level `const API_BASE = …` (or `export const`) and the
   helper declarations it reads (…_DEFAULT, CRA_URL, VITE_URL, fromWindow …,
   plus the `try { VITE = import.meta… }` statements) are removed — a helper
   only when nothing else in the file uses it — and one import is added.
   Everything else is left byte-for-byte.

   Usage: node scripts/use-central-api.js <file> [...]      (--dry to preview) */
const fs = require("fs");
const path = require("path");
const parser = require("@babel/parser");

const ROOT = path.resolve(__dirname, "..");
const CONFIG = path.join(ROOT, "src", "config", "api");
const args = process.argv.slice(2);
const DRY = args.includes("--dry");
const files = args.filter((a) => a !== "--dry");

function idsIn(node, out = new Set()) {
  if (!node || typeof node !== "object") return out;
  if (Array.isArray(node)) { node.forEach((n) => idsIn(n, out)); return out; }
  if (node.type === "Identifier") out.add(node.name);
  for (const k of Object.keys(node)) {
    if (k === "loc" || k === "start" || k === "end" || k === "leadingComments" || k === "trailingComments") continue;
    // property keys (x.y / {y: …}) are not variable references
    if ((node.type === "MemberExpression" && k === "property" && !node.computed) ||
        (node.type === "ObjectProperty" && k === "key" && !node.computed)) continue;
    idsIn(node[k], out);
  }
  return out;
}

for (const rel of files) {
  const file = path.resolve(rel);
  const src = fs.readFileSync(file, "utf8");
  const ast = parser.parse(src, { sourceType: "module", plugins: ["jsx", "classProperties", "optionalChaining", "nullishCoalescingOperator"] });
  const body = ast.program.body;

  const declOf = (n) => (n.type === "ExportNamedDeclaration" ? n.declaration : n);
  const names = (n) => {
    const d = declOf(n);
    return d && d.type === "VariableDeclaration" ? d.declarations.map((x) => x.id.name).filter(Boolean) : [];
  };
  const target = body.find((n) => names(n).includes("API_BASE"));
  if (!target) { console.log(`- ${rel}: no top-level API_BASE, skipped`); continue; }
  if (names(target).length !== 1) { console.log(`- ${rel}: API_BASE shares a declaration, skipped`); continue; }
  const exported = target.type === "ExportNamedDeclaration";

  // helpers reachable from API_BASE's initialiser, transitively
  const topDecl = new Map();
  body.forEach((n) => names(n).forEach((nm) => topDecl.set(nm, n)));
  const remove = new Set([target]);
  const queue = [...idsIn(declOf(target).declarations[0].init)];
  const helperNames = new Set();
  while (queue.length) {
    const id = queue.pop();
    const n = topDecl.get(id);
    if (!n || remove.has(n) || names(n).length !== 1) continue;
    helperNames.add(id);
    remove.add(n);
    const init = declOf(n).declarations[0].init;
    if (init) queue.push(...idsIn(init));
  }
  // try { X = import.meta… } statements that only feed a removed helper
  body.forEach((n) => {
    if (n.type !== "TryStatement") return;
    const code = src.slice(n.start, n.end);
    if (/import\.meta/.test(code) && [...helperNames].some((h) => new RegExp(`\\b${h}\\s*=`).test(code))) remove.add(n);
  });

  // a helper still referenced outside the removed code stays
  const removedRanges = [...remove].map((n) => [n.start, n.end]);
  const outside = (i) => !removedRanges.some(([a, b]) => i >= a && i < b);
  for (const h of [...helperNames]) {
    const re = new RegExp(`\\b${h}\\b`, "g");
    let m, usedOutside = false;
    while ((m = re.exec(src))) if (outside(m.index)) { usedOutside = true; break; }
    if (usedOutside) {
      helperNames.delete(h);
      remove.delete(topDecl.get(h));
    }
  }

  // cut (with each statement's own line), then add the import after the last import
  const cuts = [...remove].map((n) => {
    let a = n.start, b = n.end;
    while (a > 0 && src[a - 1] !== "\n") a--;
    if (src[b] === "\r") b++;
    if (src[b] === "\n") b++;
    return [a, b];
  }).sort((x, y) => y[0] - x[0]);
  let out = src;
  for (const [a, b] of cuts) out = out.slice(0, a) + out.slice(b);

  let spec = path.relative(path.dirname(file), CONFIG).split(path.sep).join("/");
  if (!spec.startsWith(".")) spec = "./" + spec;
  const importLine = `import API_BASE from "${spec}";` + (exported ? `\nexport { API_BASE };` : "");
  const ast2 = parser.parse(out, { sourceType: "module", plugins: ["jsx", "classProperties", "optionalChaining", "nullishCoalescingOperator"] });
  const imports = ast2.program.body.filter((n) => n.type === "ImportDeclaration");
  const at = imports.length ? imports[imports.length - 1].end : 0;
  const nl = out.includes("\r\n") ? "\r\n" : "\n";
  out = out.slice(0, at) + (at ? nl : "") + importLine.replace(/\n/g, nl) + (at ? "" : nl) + out.slice(at);
  // tidy: no more than one blank line where the block was
  out = out.replace(/(\r?\n){3,}/g, nl + nl);

  console.log(`✓ ${rel}: removed API_BASE${helperNames.size ? " + " + [...helperNames].join(", ") : ""}${exported ? " (re-exported)" : ""}`);
  if (!DRY) fs.writeFileSync(file, out);
}
