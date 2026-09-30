#!/usr/bin/env node
/* scripts/prune-imports.js — drop import specifiers a file no longer uses
   (after a split moved their users away). Uses Babel's scope analysis, so a
   name counts as used only where it really refers to the import. Side-effect
   imports ("import './x.css'") and React (while the file has JSX) stay.
   Usage: node scripts/prune-imports.js <file> [...] */
const fs = require("fs");
const parser = require("@babel/parser");
const traverse = (require("@babel/traverse").default || require("@babel/traverse"));
const PLUGINS = ["jsx", "classProperties", "optionalChaining", "nullishCoalescingOperator", "dynamicImport"];

for (const file of process.argv.slice(2)) {
  const src = fs.readFileSync(file, "utf8");
  const ast = parser.parse(src, { sourceType: "module", plugins: PLUGINS });
  let hasJsx = false;
  const unused = new Set();
  traverse(ast, {
    JSXElement() { hasJsx = true; },
    JSXFragment() { hasJsx = true; },
    ImportDeclaration(p) {
      for (const s of p.get("specifiers")) {
        const b = p.scope.getBinding(s.node.local.name);
        if (b && !b.referenced) unused.add(s.node);
      }
    },
  });
  let out = src;
  const decls = ast.program.body.filter((n) => n.type === "ImportDeclaration" && n.specifiers.some((s) => unused.has(s) && !(s.local.name === "React" && hasJsx)));
  for (const n of decls.reverse()) {
    const keep = n.specifiers.filter((s) => !unused.has(s) || (s.local.name === "React" && hasJsx));
    let text = "";
    if (keep.length) {
      const def = keep.find((s) => s.type === "ImportDefaultSpecifier");
      const ns = keep.find((s) => s.type === "ImportNamespaceSpecifier");
      const named = keep.filter((s) => s.type === "ImportSpecifier").map((s) => (s.imported.name === s.local.name ? s.local.name : `${s.imported.name} as ${s.local.name}`));
      text = `import ${[def && def.local.name, ns && `* as ${ns.local.name}`, named.length && `{ ${named.join(", ")} }`].filter(Boolean).join(", ")} from "${n.source.value}";`;
    }
    let a = n.start, b = n.end;
    if (!text) { while (a > 0 && out[a - 1] !== "\n") a--; if (out[b] === "\r") b++; if (out[b] === "\n") b++; }
    out = out.slice(0, a) + text + out.slice(b);
  }
  const dropped = [...unused].filter((s) => !(s.local.name === "React" && hasJsx)).map((s) => s.local.name);
  if (out !== src) fs.writeFileSync(file, out);
  console.log(`${file}: ${dropped.length ? "dropped " + dropped.join(", ") : "nothing unused"}`);
}
