#!/usr/bin/env node
/* scripts/extract-component.js — split a giant React component safely.

   Two moves, both driven by Babel's scope analysis (never by guessing):

   jsx  — a JSX element of the component becomes its own component in a new
          file. Every variable of the parent it uses becomes a prop of the
          same name; the element is replaced by <Name a={a} b={b} />.
   hook — a run of statements of the component (state, effects, handlers)
          becomes a custom hook in a new file. What it reads from earlier in
          the component becomes its argument; what the rest of the component
          uses from it is returned: const { x, y } = useName({ a, b }).

   It refuses instead of guessing when the move would change behaviour:
   the moved code assigns to a variable it does not own, uses a top-level
   declaration of this file (that would be an import cycle), uses
   `this`/`arguments`, a hoisted function would be used before its new
   definition point, or a prop name would collide with key/ref/children.

   Usage: node scripts/extract-component.js <op.json> [--dry]
     { "file": "src/…/Big.jsx",
       "mode": "jsx",  "line": 812,               (the JSX element's first line)
       "name": "SessionsTable", "to": "src/…/big/SessionsTable.jsx", "about": "…" }
     { "file": …, "mode": "hook", "from": 40, "through": 180, "name": "useSessionsData", "to": …, "about": … }
*/
const fs = require("fs");
const path = require("path");
const parser = require("@babel/parser");
const traverse = (require("@babel/traverse").default || require("@babel/traverse"));

const ROOT = path.resolve(__dirname, "..");
const [opFile, flag] = process.argv.slice(2);
const DRY = flag === "--dry";
const op = JSON.parse(fs.readFileSync(opFile, "utf8"));
const PLUGINS = ["jsx", "classProperties", "optionalChaining", "nullishCoalescingOperator", "dynamicImport"];
const fail = (m) => { console.error(`✗ ${op.name}: ${m}`); process.exit(1); };

const file = path.resolve(ROOT, op.file);
const toFile = path.resolve(ROOT, op.to);
if (fs.existsSync(toFile) && !DRY) fail(`${op.to} already exists`);
const src = fs.readFileSync(file, "utf8");
const NL = src.includes("\r\n") ? "\r\n" : "\n";
const ast = parser.parse(src, { sourceType: "module", plugins: PLUGINS });

/* ---------- the component ---------- */
let comp = null;
traverse(ast, {
  "FunctionDeclaration|ArrowFunctionExpression|FunctionExpression"(p) {
    if (comp) return;
    const named = op.component
      ? (p.node.id && p.node.id.name === op.component) || (p.parentPath.isVariableDeclarator() && p.parentPath.node.id.name === op.component)
      : p.parentPath.isExportDefaultDeclaration();
    if (named) comp = p;
  },
});
if (!comp) fail(`component ${op.component || "(default export)"} not found`);
const compScope = comp.scope;
const inside = (node, outer) => node.start >= outer.start && node.end <= outer.end;

/* ---------- module-level imports (to copy into the new file) ---------- */
const imports = new Map();
for (const n of ast.program.body) {
  if (n.type !== "ImportDeclaration") continue;
  for (const s of n.specifiers) imports.set(s.local.name, { source: n.source.value, kind: s.type, imported: s.imported ? s.imported.name : null });
}
const relSpec = (fromFile, target) => {
  let r = path.relative(path.dirname(fromFile), target).split(path.sep).join("/").replace(/\.(jsx?|tsx?)$/, "");
  return r.startsWith(".") ? r : "./" + r;
};
function importLines(names) {
  const bySrc = new Map();
  for (const nm of names) {
    const im = imports.get(nm);
    const s = im.source.startsWith(".") ? relSpec(toFile, path.resolve(path.dirname(file), im.source)) : im.source;
    if (!bySrc.has(s)) bySrc.set(s, { def: null, ns: null, named: [] });
    const g = bySrc.get(s);
    if (im.kind === "ImportDefaultSpecifier") g.def = nm;
    else if (im.kind === "ImportNamespaceSpecifier") g.ns = nm;
    else g.named.push(im.imported === nm ? nm : `${im.imported} as ${nm}`);
  }
  return [...bySrc].map(([s, g]) => (g.ns
    ? `import ${g.def ? g.def + ", " : ""}* as ${g.ns} from "${s}";`
    : `import ${[g.def, g.named.length ? `{ ${g.named.join(", ")} }` : null].filter(Boolean).join(", ")} from "${s}";`));
}

/* ---------- free variables of a region ---------- */
// region = { start, end } in source offsets; paths = the node paths it spans
function analyse(regionPaths, region) {
  const external = new Map(); // name → binding (declared outside the region, inside the component's scopes)
  const moduleImports = new Set();
  const problems = [];
  const visit = {
    "Identifier|JSXIdentifier"(p) {
      if (!p.isReferencedIdentifier() && !(p.isJSXIdentifier() && p.parentPath.isJSXOpeningElement() && /^[A-Z]/.test(p.node.name)) &&
          !(p.isJSXIdentifier() && p.parentPath.isJSXMemberExpression() && p.parentPath.node.object === p.node)) return;
      const name = p.node.name;
      const b = p.scope.getBinding(name);
      if (!b) return; // a global (window, fetch, …)
      if (inside(b.path.node, region)) return; // declared inside the region
      if (b.scope === p.scope.getProgramParent()) {
        if (b.kind === "module") moduleImports.add(name);
        else problems.push(`uses top-level "${name}" of this file (would be an import cycle — move it out first)`);
        return;
      }
      // passed at the call site: it must already exist there
      if (b.path.node.start > region.end) problems.push(`uses "${name}", which is declared after the moved code`);
      external.set(name, b);
    },
    "AssignmentExpression|UpdateExpression"(p) {
      const t = p.node.left || p.node.argument;
      const names = t.type === "Identifier" ? [t.name] : t.type === "ObjectPattern" || t.type === "ArrayPattern" ? Object.keys(p.get(p.node.left ? "left" : "argument").getBindingIdentifiers()) : [];
      for (const nm of names) {
        const b = p.scope.getBinding(nm);
        if (b && !inside(b.path.node, region)) problems.push(`assigns to "${nm}", declared outside the moved code`);
      }
    },
    ThisExpression() { problems.push("uses `this`"); },
    Identifier(p) { if (p.node.name === "arguments" && p.isReferencedIdentifier() && !p.scope.getBinding("arguments")) problems.push("uses `arguments`"); },
  };
  regionPaths.forEach((rp) => { rp.traverse(visit); if (rp.isIdentifier() || rp.isJSXIdentifier()) visit["Identifier|JSXIdentifier"](rp); });
  return { external, moduleImports, problems: [...new Set(problems)] };
}
const indent = (text, pad) => text.split(/\r?\n/).map((l) => (l.trim() ? pad + l : l)).join(NL);
const dedent = (text) => {
  const lines = text.split(/\r?\n/);
  const m = Math.min(...lines.slice(1).filter((l) => l.trim()).map((l) => l.match(/^ */)[0].length), 1e9);
  return [lines[0], ...lines.slice(1).map((l) => l.slice(Math.min(m, l.match(/^ */)[0].length)))].join(NL);
};
const header = () => [`// ${path.relative(ROOT, toFile).split(path.sep).join("/")}`,
  ...String(op.about || "").split("\n").filter(Boolean).map((l) => `// ${l}`),
  `// (Extracted from ${path.basename(file)} — the code is unchanged.)`];

let replacement, newText, region;

if (op.mode === "jsx") {
  let el = null;
  comp.traverse({
    "JSXElement|JSXFragment"(p) {
      if (!el && p.node.loc.start.line === op.line) { el = p; p.stop(); }
    },
  });
  if (!el) fail(`no JSX element starts on line ${op.line}`);
  region = { start: el.node.start, end: el.node.end };
  const { external, moduleImports, problems } = analyse([el], region);
  if (problems.length) fail(problems.join("; "));
  const props = [...external.keys()];
  const bad = props.filter((p) => ["key", "ref", "children"].includes(p));
  if (bad.length) fail(`prop name collides with a React reserved prop: ${bad.join(", ")}`);
  // a key on the element must stay on the element the parent renders
  let keyAttr = "";
  if (el.isJSXElement()) {
    const k = el.node.openingElement.attributes.find((a) => a.type === "JSXAttribute" && a.name.name === "key");
    if (k) keyAttr = " " + src.slice(k.start, k.end);
  }
  replacement = `<${op.name}${keyAttr}${props.map((p) => ` ${p}={${p}}`).join("")} />`;
  const body = dedent(src.slice(el.node.start, el.node.end));
  newText = [...header(), ...importLines([...moduleImports]), "",
    `export function ${op.name}(${props.length ? `{ ${props.join(", ")} }` : ""}) {`, "  return (", indent(body, "    "), "  );", "}", ""].join(NL);
  console.log(`${op.name}: JSX lines ${el.node.loc.start.line}-${el.node.loc.end.line} · ${props.length} props`);
} else if (op.mode === "hook") {
  const stmts = comp.get("body").get("body").filter((s) => s.node.loc.start.line >= op.from && s.node.loc.end.line <= op.through);
  if (!stmts.length) fail(`no statements between lines ${op.from} and ${op.through}`);
  const first = stmts[0].node, last = stmts[stmts.length - 1].node;
  if (first.loc.start.line !== op.from || last.loc.end.line !== op.through) fail(`lines ${op.from}-${op.through} do not start/end on statement boundaries (${first.loc.start.line}-${last.loc.end.line})`);
  const all = comp.get("body").get("body");
  const i0 = all.indexOf(stmts[0]);
  if (all.slice(i0, i0 + stmts.length).some((s, k) => s !== stmts[k])) fail("the lines are not one contiguous run of statements");
  region = { start: first.start, end: last.end };
  const { external, moduleImports, problems } = analyse(stmts, region);
  // names declared by the run, and who outside uses them
  const declared = new Map();
  stmts.forEach((s) => Object.entries(s.getBindingIdentifiers ? s.getOuterBindingIdentifiers() : {}).forEach(([n]) => declared.set(n, compScope.getBinding(n))));
  const outputs = [];
  for (const [name, b] of declared) {
    if (!b) continue;
    const outsideRefs = b.referencePaths.filter((r) => !inside(r.node, region));
    if (outsideRefs.length) outputs.push(name);
    if (b.kind === "hoisted" && outsideRefs.some((r) => r.node.start < region.start)) problems.push(`function "${name}" is used before the moved code (hoisting would change)`);
    if (b.constantViolations.some((v) => !inside(v.node, region))) problems.push(`"${name}" is re-assigned outside the moved code`);
    if (outsideRefs.some((r) => r.node.start < region.start && r.getFunctionParent() === comp)) problems.push(`"${name}" is read before the moved code runs`);
  }
  if (problems.length) fail([...new Set(problems)].join("; "));
  const inputs = [...external.keys()];
  const call = `${op.name}(${inputs.length ? `{ ${inputs.join(", ")} }` : ""})`;
  const lead = src.slice(src.lastIndexOf("\n", first.start) + 1, first.start);
  replacement = outputs.length ? `const { ${outputs.join(", ")} } = ${call};` : `${call};`;
  const body = dedent(lead + src.slice(first.start, last.end)).replace(/^\s+/, "");
  newText = [...header(), ...importLines([...moduleImports]), "",
    `export function ${op.name}(${inputs.length ? `{ ${inputs.join(", ")} }` : ""}) {`, indent(body, "  "),
    ...(outputs.length ? [`  return { ${outputs.join(", ")} };`] : []), "}", ""].join(NL);
  console.log(`${op.name}: statements lines ${op.from}-${op.through} · in: ${inputs.length} · out: ${outputs.length}`);
} else if (op.mode === "hoist") {
  /* Constants (style objects, pure helpers) that the component re-creates on
     every render but that use nothing of the component: they move out to
     module level of a new file. Refused if they read any component variable,
     or if anything mutates / re-assigns them (they become shared). */
  const stmts = comp.get("body").get("body").filter((s) => s.node.loc.start.line >= op.from && s.node.loc.end.line <= op.through);
  if (!stmts.length) fail(`no statements between lines ${op.from} and ${op.through}`);
  const first = stmts[0].node, last = stmts[stmts.length - 1].node;
  if (first.loc.start.line !== op.from || last.loc.end.line !== op.through) fail(`lines ${op.from}-${op.through} do not start/end on statement boundaries`);
  if (stmts.some((s) => !s.isVariableDeclaration() || s.node.kind !== "const")) fail("only const declarations can be hoisted");
  region = { start: first.start, end: last.end };
  const { external, moduleImports, problems } = analyse(stmts, region);
  if (external.size) problems.push(`reads component variables: ${[...external.keys()].join(", ")}`);
  const names = stmts.flatMap((s) => Object.keys(s.getOuterBindingIdentifiers()));
  for (const nm of names) {
    const b = compScope.getBinding(nm);
    if (b.constantViolations.length) problems.push(`"${nm}" is re-assigned`);
    for (const r of b.referencePaths) {
      const par = r.parentPath;
      if (par.isMemberExpression() && par.node.object === r.node) {
        const top = par.parentPath;
        if ((top.isAssignmentExpression() && top.node.left === par.node) || top.isUpdateExpression() || (top.isUnaryExpression() && top.node.operator === "delete"))
          problems.push(`"${nm}" is mutated (${nm}.${par.node.property.name || "[…]"} = …)`);
      }
    }
  }
  if (problems.length) fail([...new Set(problems)].join("; "));
  const body = stmts.map((s) => "export " + dedent(src.slice(s.node.start, s.node.end))).join(NL);
  newText = [...header(), ...importLines([...moduleImports]), "", body, ""].join(NL);
  replacement = "";
  op.importNames = names;
  console.log(`${op.name}: hoisted ${names.length} constants (${names.join(", ")})`);
} else fail(`unknown mode ${op.mode}`);

/* ---------- write ---------- */
let rest = src.slice(0, region.start) + replacement + src.slice(region.end);
const lastImport = ast.program.body.filter((n) => n.type === "ImportDeclaration").pop();
const importLine = `import { ${(op.importNames || [op.name]).join(", ")} } from "${relSpec(file, toFile)}";`;
rest = rest.slice(0, lastImport.end) + NL + importLine + rest.slice(lastImport.end);
for (const [label, text] of [["original", rest], ["new file", newText]]) {
  try { parser.parse(text, { sourceType: "module", plugins: PLUGINS }); }
  catch (e) { fail(`the ${label} would not parse: ${e.message}`); }
}
console.log(`  ${op.file}: ${src.split("\n").length} → ${rest.split("\n").length} lines · + ${op.to} (${newText.split("\n").length})`);
if (DRY) process.exit(0);
fs.mkdirSync(path.dirname(toFile), { recursive: true });
fs.writeFileSync(toFile, newText);
fs.writeFileSync(file, rest);
