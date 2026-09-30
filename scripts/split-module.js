#!/usr/bin/env node
/* scripts/split-module.js — move top-level declarations out of a large file
   into sibling files, wiring every import both ways. Behaviour-preserving:
   declarations are copied byte-for-byte, only `export` / `import` lines are
   added.

   Usage: node scripts/split-module.js <plan.json> [--dry]
   plan.json:
     { "file": "src/…/Big.jsx",
       "parts": [ { "to": "src/…/big/styles.js", "names": ["S", "CARD_CSS"],
                    "about": "Styles of the Big screen." }, … ] }

   Rules it enforces (it refuses rather than guess):
   • A moved declaration drags along every top-level declaration it uses
     (transitively), so a new file never imports back from the file it was
     split from — no import cycles, no temporal-dead-zone surprises.
   • The default export (the screen itself) never moves.
   • A name that the remaining code re-assigns cannot move (an import binding
     is read-only).
   • Names exported by the original stay exported from it (re-export), so
     other files importing them keep working unchanged.                      */
const fs = require("fs");
const path = require("path");
const parser = require("@babel/parser");

const ROOT = path.resolve(__dirname, "..");
const [planFile, flag] = process.argv.slice(2);
const DRY = flag === "--dry";
const plan = JSON.parse(fs.readFileSync(planFile, "utf8"));
const PLUGINS = ["jsx", "classProperties", "optionalChaining", "nullishCoalescingOperator", "dynamicImport"];

const file = path.resolve(ROOT, plan.file);
const src = fs.readFileSync(file, "utf8");
const NL = src.includes("\r\n") ? "\r\n" : "\n";
const ast = parser.parse(src, { sourceType: "module", plugins: PLUGINS });
const body = ast.program.body;

/* ---------- inventory of the original file ---------- */
const imports = new Map(); // local name → { source, kind: default|named|namespace, imported }
const importNodes = body.filter((n) => n.type === "ImportDeclaration");
for (const n of importNodes) {
  for (const s of n.specifiers) {
    imports.set(s.local.name, {
      source: n.source.value,
      kind: s.type === "ImportDefaultSpecifier" ? "default" : s.type === "ImportNamespaceSpecifier" ? "namespace" : "named",
      imported: s.imported ? s.imported.name : null,
    });
  }
}
const inner = (n) => (n.type === "ExportNamedDeclaration" && n.declaration ? n.declaration : n);
function declNames(n) {
  const d = inner(n);
  if (d.type === "VariableDeclaration") return d.declarations.flatMap((x) => patternNames(x.id));
  if ((d.type === "FunctionDeclaration" || d.type === "ClassDeclaration") && d.id) return [d.id.name];
  return [];
}
function patternNames(p) {
  if (!p) return [];
  if (p.type === "Identifier") return [p.name];
  if (p.type === "ObjectPattern") return p.properties.flatMap((q) => patternNames(q.value || q.argument));
  if (p.type === "ArrayPattern") return p.elements.flatMap(patternNames);
  if (p.type === "AssignmentPattern") return patternNames(p.left);
  if (p.type === "RestElement") return patternNames(p.argument);
  return [];
}
const topByName = new Map();
body.forEach((n) => declNames(n).forEach((nm) => topByName.set(nm, n)));
const defaultNode = body.find((n) => n.type === "ExportDefaultDeclaration");
const defaultName = defaultNode && defaultNode.declaration.id ? defaultNode.declaration.id.name : null;

/* identifiers referenced inside a node (over-approximation is harmless:
   only names that are top-level declarations or imports are acted on) */
function refs(node, out = new Set()) {
  if (!node || typeof node !== "object") return out;
  if (Array.isArray(node)) { node.forEach((n) => refs(n, out)); return out; }
  if (node.type === "Identifier" || node.type === "JSXIdentifier") out.add(node.name);
  for (const k of Object.keys(node)) {
    if (k === "loc" || k === "start" || k === "end" || k === "leadingComments" || k === "trailingComments" || k === "innerComments") continue;
    if (node.type === "MemberExpression" && k === "property" && !node.computed) continue;
    if (node.type === "OptionalMemberExpression" && k === "property" && !node.computed) continue;
    if ((node.type === "ObjectProperty" || node.type === "ObjectMethod" || node.type === "ClassProperty" || node.type === "ClassMethod") && k === "key" && !node.computed) continue;
    if (node.type === "JSXAttribute" && k === "name") continue;
    if (node.type === "JSXMemberExpression" && k === "property") continue;
    refs(node[k], out);
  }
  return out;
}

/* ---------- which statements go where ---------- */
const owner = new Map(); // statement node → part index
plan.parts.forEach((part, i) => {
  for (const nm of part.names) {
    const n = topByName.get(nm);
    if (!n) throw new Error(`"${nm}" is not a top-level declaration of ${plan.file}`);
    if (n === defaultNode) throw new Error(`"${nm}" is the default export — it stays`);
    if (owner.has(n) && owner.get(n) !== i) throw new Error(`"${nm}" is listed in two parts`);
    owner.set(n, i);
  }
});
// drag dependencies along (to the part that first needs them)
let grew = true;
while (grew) {
  grew = false;
  for (const [n, i] of [...owner]) {
    for (const id of refs(n)) {
      const dep = topByName.get(id);
      if (!dep || dep === n || dep === defaultNode || owner.has(dep)) continue;
      owner.set(dep, i);
      grew = true;
    }
  }
}
// dependencies between parts must not form a cycle
const partDeps = plan.parts.map(() => new Set());
for (const [n, i] of owner) for (const id of refs(n)) {
  const dep = topByName.get(id);
  if (dep && owner.has(dep) && owner.get(dep) !== i) partDeps[i].add(owner.get(dep));
}
const visiting = new Set(), done = new Set();
const cyc = (i) => { if (done.has(i)) return; if (visiting.has(i)) throw new Error(`parts ${[...visiting].join("→")} depend on each other in a cycle`); visiting.add(i); partDeps[i].forEach(cyc); visiting.delete(i); done.add(i); };
plan.parts.forEach((_, i) => cyc(i));

// the remaining code must not re-assign a moved name
const movedNames = new Set([...owner.keys()].flatMap(declNames));
const remainingNodes = body.filter((n) => !owner.has(n) && n.type !== "ImportDeclaration");
(function assigns(node) {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) return node.forEach(assigns);
  if ((node.type === "AssignmentExpression" && node.left.type === "Identifier" && movedNames.has(node.left.name)) ||
      (node.type === "UpdateExpression" && node.argument.type === "Identifier" && movedNames.has(node.argument.name))) {
    throw new Error(`the remaining code assigns to moved "${node.left ? node.left.name : node.argument.name}" — cannot move it`);
  }
  for (const k of Object.keys(node)) if (k !== "loc") assigns(node[k]);
})(remainingNodes);

/* ---------- text helpers ---------- */
// a statement with the comments that belong to it (directly above, after the previous statement)
function span(n) {
  const idx = body.indexOf(n);
  const prevEnd = idx > 0 ? body[idx - 1].end : 0;
  const prevLine = idx > 0 ? body[idx - 1].loc.end.line : 0;
  let a = n.start;
  // a comment on the previous statement's own line belongs to that statement
  for (const c of n.leadingComments || []) if (c.start >= prevEnd && c.loc.start.line > prevLine && c.start < a) a = c.start;
  while (a > 0 && src[a - 1] !== "\n") a--;
  let b = n.end;
  while (b < src.length && src[b] !== "\n") b++; // trailing same-line comment
  if (b < src.length) b++;
  return [a, b];
}
const relSpec = (fromFile, toFile) => {
  let r = path.relative(path.dirname(fromFile), toFile).split(path.sep).join("/").replace(/\.(jsx?|tsx?)$/, "");
  return r.startsWith(".") ? r : "./" + r;
};
const moveSource = (source, toFile) => (source.startsWith(".") ? relSpec(toFile, path.resolve(path.dirname(file), source)) : source);
function importLines(names, toFile) {
  // group original imports by source
  const bySrc = new Map();
  for (const nm of names) {
    const im = imports.get(nm);
    if (!im) continue;
    const s = moveSource(im.source, toFile);
    if (!bySrc.has(s)) bySrc.set(s, { def: null, ns: null, named: [] });
    const g = bySrc.get(s);
    if (im.kind === "default") g.def = nm;
    else if (im.kind === "namespace") g.ns = nm;
    else g.named.push(im.imported === nm ? nm : `${im.imported} as ${nm}`);
  }
  const lines = [];
  for (const [s, g] of bySrc) {
    if (g.ns) lines.push(`import ${g.def ? g.def + ", " : ""}* as ${g.ns} from "${s}";`);
    else {
      const parts = [g.def, g.named.length ? `{ ${g.named.join(", ")} }` : null].filter(Boolean);
      lines.push(`import ${parts.join(", ")} from "${s}";`);
    }
  }
  return lines;
}
const withExport = (text, n) => (n.type === "ExportNamedDeclaration" ? text : text.replace(/^(\s*(?:\/\*[\s\S]*?\*\/\s*|\/\/[^\n]*\n\s*)*)/, (m) => m + "export "));

/* ---------- build each new part ---------- */
const outputs = [];
plan.parts.forEach((part, i) => {
  const toFile = path.resolve(ROOT, part.to);
  const nodes = body.filter((n) => owner.get(n) === i);
  const used = new Set(nodes.flatMap((n) => [...refs(n)]));
  const own = new Set(nodes.flatMap(declNames));
  const lines = importLines([...used].filter((nm) => imports.has(nm) && !own.has(nm)), toFile);
  // names from other parts
  plan.parts.forEach((other, j) => {
    if (j === i) return;
    const theirs = body.filter((n) => owner.get(n) === j).flatMap(declNames).filter((nm) => used.has(nm));
    if (theirs.length) lines.push(`import { ${theirs.join(", ")} } from "${relSpec(toFile, path.resolve(ROOT, other.to))}";`);
  });
  const rel = path.relative(ROOT, toFile).split(path.sep).join("/");
  const header = [`// ${rel}`, ...String(part.about || "").split("\n").filter(Boolean).map((l) => `// ${l}`),
    `// (Split out of ${path.basename(file)} — the code is unchanged.)`];
  const code = nodes.map((n) => { const [a, b] = span(n); return withExport(src.slice(a, b), n); }).join(NL).replace(/\r?\n/g, NL);
  const text = [...header, ...lines, "", code.trimEnd(), ""].join(NL);
  outputs.push({ toFile, text, names: nodes.flatMap(declNames) });
});

/* ---------- the original, lighter ---------- */
// merge touching/overlapping ranges so no text is removed twice
const cut = [...owner.keys()].map(span).sort((x, y) => x[0] - y[0])
  .reduce((acc, r) => { const last = acc[acc.length - 1]; if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1]); else acc.push([...r]); return acc; }, [])
  .sort((x, y) => y[0] - x[0]);
// safety: no cut may reach into a statement that stays
for (const n of body) {
  if (owner.has(n)) continue;
  for (const [a, b] of cut) {
    if (a < n.end && b > n.start) {
      throw new Error(`cut ${a}-${b} overlaps a remaining ${n.type} at lines ${n.loc.start.line}-${n.loc.end.line}`);
    }
  }
}
let rest = src;
for (const [a, b] of cut) rest = rest.slice(0, a) + rest.slice(b);
let restAst;
try {
  restAst = parser.parse(rest, { sourceType: "module", plugins: PLUGINS });
} catch (e) {
  const ln = e.loc ? e.loc.line : 0;
  const lines = rest.split("\n");
  console.error(`✗ the lighter ${path.basename(file)} would not parse (${e.message}). Around it:`);
  for (let k = Math.max(0, ln - 6); k < Math.min(lines.length, ln + 3); k++) console.error(`${String(k + 1).padStart(5)}| ${lines[k]}`);
  process.exit(1);
}
const restRefs = refs(restAst.program.body.filter((n) => n.type !== "ImportDeclaration"));
const exportedBefore = new Set(body.filter((n) => n.type === "ExportNamedDeclaration" && n.declaration).flatMap(declNames));
const addLines = [];
const reexportLines = [];
outputs.forEach((o) => {
  const need = o.names.filter((nm) => restRefs.has(nm));
  const reexport = o.names.filter((nm) => exportedBefore.has(nm));
  const spec = relSpec(file, o.toFile);
  if (need.length) addLines.push(`import { ${need.join(", ")} } from "${spec}";`);
  if (reexport.length) reexportLines.push(`export { ${reexport.join(", ")} } from "${spec}";`);
});
addLines.push(...reexportLines); // after every import (ESLint import/first)
/* Imports the original no longer uses are dropped (a moved block took its
   users along). Side-effect imports ("import './x.css'") always stay, and so
   does React while the file still has JSX. */
const restCode = restAst.program.body.filter((n) => n.type !== "ImportDeclaration").map((n) => rest.slice(n.start, n.end)).join("\n");
const hasJsx = /<[A-Za-z][\w.]*[\s/>]/.test(restCode);
const restImports = restAst.program.body.filter((n) => n.type === "ImportDeclaration");
for (const n of [...restImports].reverse()) {
  if (!n.specifiers.length) continue;
  const keep = n.specifiers.filter((s) => restRefs.has(s.local.name) || (s.local.name === "React" && hasJsx));
  if (keep.length === n.specifiers.length) continue;
  let text = "";
  if (keep.length) {
    const def = keep.find((s) => s.type === "ImportDefaultSpecifier");
    const ns = keep.find((s) => s.type === "ImportNamespaceSpecifier");
    const named = keep.filter((s) => s.type === "ImportSpecifier").map((s) => (s.imported.name === s.local.name ? s.local.name : `${s.imported.name} as ${s.local.name}`));
    const partsTxt = [def && def.local.name, ns && `* as ${ns.local.name}`, named.length && `{ ${named.join(", ")} }`].filter(Boolean);
    text = `import ${partsTxt.join(", ")} from "${n.source.value}";`;
  }
  let a = n.start, b = n.end;
  if (!text) { while (a > 0 && rest[a - 1] !== "\n") a--; if (rest[b] === "\r") b++; if (rest[b] === "\n") b++; }
  rest = rest.slice(0, a) + text + rest.slice(b);
}
const restAst2 = parser.parse(rest, { sourceType: "module", plugins: PLUGINS });
const lastImport = restAst2.program.body.filter((n) => n.type === "ImportDeclaration").pop();
const at = lastImport ? lastImport.end : 0;
rest = rest.slice(0, at) + (at ? NL : "") + addLines.join(NL) + (at ? "" : NL) + rest.slice(at);
rest = rest.replace(/(\r?\n){3,}/g, NL + NL);

/* Proof that no code changed: every top-level statement of the original
   (imports aside) must appear exactly once across the new files + the
   lighter original — byte-for-byte, the added `export ` aside. */
{
  const stmts = (text) => parser.parse(text, { sourceType: "module", plugins: PLUGINS }).program.body
    .filter((n) => n.type !== "ImportDeclaration" && !(n.type === "ExportNamedDeclaration" && !n.declaration))
    .map((n) => text.slice(n.start, n.end).replace(/^export (?!default)/, "").replace(/\r\n/g, "\n"));
  const want = body.filter((n) => n.type !== "ImportDeclaration" && !(n.type === "ExportNamedDeclaration" && !n.declaration))
    .map((n) => src.slice(n.start, n.end).replace(/^export (?!default)/, "").replace(/\r\n/g, "\n")).sort();
  const got = [rest, ...outputs.map((o) => o.text)].flatMap(stmts).sort();
  if (want.length !== got.length || want.some((w, k) => w !== got[k])) {
    const miss = want.filter((w) => !got.includes(w)).map((w) => w.split("\n")[0]);
    const extra = got.filter((g) => !want.includes(g)).map((g) => g.split("\n")[0]);
    throw new Error(`code changed during the split!\n  missing: ${miss.join(" | ")}\n  extra: ${extra.join(" | ")}`);
  }
  console.log(`  ✓ ${want.length} statements, all present exactly once, unchanged`);
}

const before = src.split("\n").length;
console.log(`${plan.file}: ${before} lines → ${rest.split("\n").length}`);
outputs.forEach((o) => console.log(`  + ${path.relative(ROOT, o.toFile)}  (${o.text.split("\n").length} lines: ${o.names.join(", ")})`));
if (DRY) process.exit(0);
for (const o of outputs) {
  if (fs.existsSync(o.toFile)) throw new Error(`${o.toFile} already exists`);
  fs.mkdirSync(path.dirname(o.toFile), { recursive: true });
  fs.writeFileSync(o.toFile, o.text);
}
fs.writeFileSync(file, rest);
console.log("done");
