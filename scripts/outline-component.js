#!/usr/bin/env node
/* scripts/outline-component.js — map of a big component, to plan a split.
   Prints the component's body as blocks of statements (with line ranges and
   what they declare) and the JSX tree of its render (elements of 25+ lines,
   nested), so extract-component.js can be pointed at sensible pieces.
   Usage: node scripts/outline-component.js <file> [--min 25] [--depth 4]   */
const fs = require("fs");
const parser = require("@babel/parser");
const traverse = (require("@babel/traverse").default || require("@babel/traverse"));

const file = process.argv[2];
const arg = (n, d) => { const i = process.argv.indexOf(n); return i > -1 ? Number(process.argv[i + 1]) : d; };
const MIN = arg("--min", 25), DEPTH = arg("--depth", 4);
const src = fs.readFileSync(file, "utf8");
const ast = parser.parse(src, { sourceType: "module", plugins: ["jsx", "classProperties", "optionalChaining", "nullishCoalescingOperator"] });
let comp;
traverse(ast, { ExportDefaultDeclaration(p) { comp = p.get("declaration"); p.stop(); } });
const lines = (n) => n.loc.end.line - n.loc.start.line + 1;

console.log(`\n== statements of ${comp.node.id ? comp.node.id.name : "default"} (lines ${comp.node.loc.start.line}-${comp.node.loc.end.line})`);
for (const s of comp.get("body").get("body")) {
  const n = s.node;
  const names = Object.keys(s.getOuterBindingIdentifiers ? s.getOuterBindingIdentifiers() : {});
  let what = n.type.replace("Statement", "").replace("Declaration", "");
  if (n.type === "ExpressionStatement" && n.expression.type === "CallExpression") what = (n.expression.callee.name || "call") + "()";
  if (n.type === "VariableDeclaration") {
    const init = n.declarations[0].init;
    const callee = init && init.type === "CallExpression" ? (init.callee.name || (init.callee.property && init.callee.property.name) || "") : "";
    what = callee ? `${callee}` : init ? init.type.replace("Expression", "") : "let";
  }
  console.log(`${String(n.loc.start.line).padStart(5)}-${String(n.loc.end.line).padEnd(5)} ${String(lines(n)).padStart(4)}  ${what.padEnd(22)} ${names.join(", ").slice(0, 90)}`);
}

console.log(`\n== JSX tree (elements of ${MIN}+ lines, depth ≤ ${DEPTH})`);
function label(n) {
  if (n.type === "JSXFragment") return "<>";
  const o = n.openingElement;
  const nm = o.name.type === "JSXIdentifier" ? o.name.name : o.name.type === "JSXMemberExpression" ? `${o.name.object.name}.${o.name.property.name}` : "?";
  const cls = o.attributes.find((a) => a.name && (a.name.name === "className" || a.name.name === "style"));
  const hint = cls && cls.value && cls.value.type === "StringLiteral" ? `.${cls.value.value.split(" ")[0]}` : cls && cls.value && cls.value.expression && cls.value.expression.type === "MemberExpression" ? `{${src.slice(cls.value.expression.start, cls.value.expression.end)}}` : "";
  return `<${nm}${hint}>`;
}
function walk(p, depth) {
  p.traverse({
    "JSXElement|JSXFragment"(q) {
      if (lines(q.node) >= MIN) {
        const cond = q.parentPath.isLogicalExpression() || q.parentPath.isConditionalExpression() ? " (conditional)" : q.parentPath.isArrowFunctionExpression() || q.parentPath.isReturnStatement() && q.getFunctionParent() !== comp ? " (in a callback)" : "";
        console.log(`${"  ".repeat(depth)}${String(q.node.loc.start.line).padStart(5)}-${String(q.node.loc.end.line).padEnd(5)} ${String(lines(q.node)).padStart(4)}  ${label(q.node)}${cond}`);
        if (depth < DEPTH) walk(q, depth + 1);
      }
      q.skip();
    },
  });
}
walk(comp, 0);
