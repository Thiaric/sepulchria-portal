#!/usr/bin/env node

/**
 * Sepulchria semantic JSX class-name patcher (refined semantic inference)
 *
 * Adds a readable, path-derived, semantic class token to every audited native
 * JSX element while preserving any existing className.
 *
 * Examples:
 *   admin_areas_page_button_save
 *   admin_areas_page_button_delete
 *   admin_areas_page_input_area_name
 *   admin_areas_page_section_edit_area
 *   admin_areas_page_div_actions
 *
 * If the same semantic name occurs more than once in one file, later matches
 * receive _2, _3, ... so every generated class is unique within that file.
 *
 * This refined version is deliberately conservative: it rejects implementation
 * details from JSX expressions (setOpen(false), target.checked, map IDs/keys,
 * lowerCase/replace chains, etc.) instead of turning them into CSS class names.
 *
 * Dry run (default):
 *   node .\sepulchria-add-semantic-element-classes.mjs --audit .\native-elements-audit.txt
 *
 * Apply:
 *   node .\sepulchria-add-semantic-element-classes.mjs --audit .\native-elements-audit.txt --write
 */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
let ts;
try {
  ts = require("typescript");
} catch {
  console.error(
    "ERROR: The `typescript` package could not be loaded.\n" +
    "Run this from the Sepulchria repository root after npm install."
  );
  process.exit(1);
}

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const WRITE = argv.includes("--write");
const VERBOSE = argv.includes("--verbose");

function argValue(name) {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] ?? null : null;
}
const AUDIT_ARG = argValue("--audit");

const TARGET_TAGS = new Set([
  "a", "article", "aside", "button", "details", "div", "footer", "form",
  "h1", "h2", "h3", "h4", "header", "img", "input", "label", "li",
  "main", "nav", "option", "p", "section", "select", "span", "strong",
  "summary", "table", "td", "textarea", "tr", "ul",
]);

const EXCLUDED_DIRS = new Set([
  ".git", ".next", "node_modules", "dist", "build", "coverage",
]);

const STOP_WORDS = new Set([
  "a","an","and","are","as","at","be","been","being","but","by","for",
  "from","has","have","he","her","hers","him","his","i","if","in","into",
  "is","it","its","me","my","of","on","or","our","ours","she","so",
  "that","the","their","theirs","them","there","these","they","this",
  "those","to","too","us","was","we","were","what","when","where",
  "which","who","will","with","you","your","yours",
]);

// Tokens that are usually implementation details rather than useful CSS semantics.
const CODEISH_WORDS = new Set([
  "target", "currenttarget", "checked", "preventdefault", "stoppropagation",
  "tolowercase", "touppercase", "lowercase", "uppercase", "replace",
  "replaceall", "trim", "map", "filter", "find", "some", "every",
  "math", "min", "max", "safe", "snapshot", "key", "index",
  "onclick", "onsubmit", "onchange", "oninput", "onblur", "onfocus",
  "setstate", "dispatch", "current", "valuevalue",
]);

const GENERIC_VALUE_WORDS = new Set([
  "true", "false", "null", "undefined", "yes", "no", "on", "off",
]);

function isStaticStringAttr(attr) {
  if (!attr || !attr.initializer) return false;
  const init = attr.initializer;
  if (ts.isStringLiteral(init)) return true;
  return ts.isJsxExpression(init) && init.expression &&
    (ts.isStringLiteral(init.expression) || ts.isNoSubstitutionTemplateLiteral(init.expression));
}

function staticAttrValue(node, name, sf) {
  const attr = getAttr(node, name);
  return isStaticStringAttr(attr) ? attrValue(attr, sf) : "";
}

function isUsefulSemantic(value) {
  if (!value) return false;
  const words = String(value).toLowerCase().split("_").filter(Boolean);
  if (!words.length) return false;
  if (words.every((w) => GENERIC_VALUE_WORDS.has(w))) return false;
  if (words.some((w) => CODEISH_WORDS.has(w))) return false;

  // Reject common code-expression debris that survived tokenization.
  const joined = words.join("_");
  if (/(^|_)(target|current_target|checked|lower_case|upper_case|replace|replace_all)(_|$)/.test(joined)) return false;
  if (/(^|_)(math_min|math_max|safe_target|code_snapshot|target_checked)(_|$)/.test(joined)) return false;
  if (/^(set|toggle)_[a-z0-9_]+_(true|false|value|checked)$/.test(joined)) return false;
  return true;
}

function slash(p) { return p.replaceAll("\\", "/"); }

function shouldIgnoreDir(name) {
  return EXCLUDED_DIRS.has(name) ||
    name.startsWith(".character-conditions-full-system-backup") ||
    name.startsWith(".conditions-") ||
    name.startsWith(".move-conditions-");
}

function walkTsx(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory() && shouldIgnoreDir(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkTsx(full));
    else if (entry.isFile() && entry.name.endsWith(".tsx")) out.push(full);
  }
  return out;
}

function classPrefix(relativePath) {
  let p = slash(relativePath).replace(/\.tsx$/i, "");
  let parts = p.split("/").filter(Boolean);
  if (parts[0] === "app") parts = parts.slice(1);
  parts = parts.filter((part) => part !== "(portal)");

  return parts
    .map((part) => part
      .replace(/^\[\[(?:\.\.\.)?(.+?)\]\]$/, "$1")
      .replace(/^\[(?:\.\.\.)?(.+?)\]$/, "$1")
      .replace(/[^A-Za-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .toLowerCase())
    .filter(Boolean)
    .join("_");
}

function parseAudit(auditPath) {
  const text = fs.readFileSync(auditPath, "utf8");
  const map = new Map();
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^(.+?\.tsx)\s{2,}([a-z0-9,\s]+)\s*$/i);
    if (!match) continue;
    const file = slash(match[1].trim());
    const tags = new Set(match[2].split(",").map((s) => s.trim()).filter(Boolean));
    map.set(file, tags);
  }
  return map;
}

function intrinsicTagName(node, sf) {
  if (!ts.isJsxOpeningElement(node) && !ts.isJsxSelfClosingElement(node)) return null;
  const name = node.tagName.getText(sf);
  return /^[a-z][a-z0-9-]*$/.test(name) ? name : null;
}

function getAttr(node, name) {
  return node.attributes.properties.find(
    (p) => ts.isJsxAttribute(p) && p.name.getText() === name
  ) ?? null;
}

function attrValue(attr, sf) {
  if (!attr || !attr.initializer) return "";
  const init = attr.initializer;
  if (ts.isStringLiteral(init)) return init.text;
  if (ts.isJsxExpression(init) && init.expression) {
    if (ts.isStringLiteral(init.expression) || ts.isNoSubstitutionTemplateLiteral(init.expression)) {
      return init.expression.text;
    }
    return init.expression.getText(sf);
  }
  return "";
}

function directText(node, sf) {
  if (!ts.isJsxElement(node.parent)) return "";
  const parts = [];
  for (const child of node.parent.children) {
    if (ts.isJsxText(child)) parts.push(child.getText(sf));
    else if (ts.isJsxExpression(child) && child.expression &&
      (ts.isStringLiteral(child.expression) || ts.isNoSubstitutionTemplateLiteral(child.expression))) {
      parts.push(child.expression.text);
    }
  }
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

function cleanWords(value, maxWords = 5) {
  if (!value) return "";
  let s = String(value)
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_\-./:]+/g, " ")
    .replace(/[^A-Za-z0-9 ]+/g, " ")
    .toLowerCase();

  const words = s.split(/\s+/).filter(Boolean).filter((w) => !STOP_WORDS.has(w));
  return words.slice(0, maxWords).join("_");
}

function cleanIdentifier(value, maxWords = 5) {
  if (!value) return "";
  return cleanWords(String(value)
    .replace(/^handle/i, "")
    .replace(/^on(?=[A-Z])/i, "")
    .replace(/^(set|toggle)(?=[A-Z])/i, "$1 ")
    .replace(/\b(e|event)\b/gi, ""), maxWords);
}

function expressionNames(node, sf) {
  const names = [];
  for (const p of node.attributes.properties) {
    if (!ts.isJsxAttribute(p)) continue;
    const n = p.name.getText();
    if (!["onClick","onSubmit","action","formAction","onChange","onInput","onBlur","onFocus"].includes(n)) continue;
    if (!p.initializer || !ts.isJsxExpression(p.initializer) || !p.initializer.expression) continue;

    const expr = p.initializer.expression;
    let raw = "";

    // Only accept direct, name-like handlers. Deliberately ignore arrow/functions and
    // arbitrary expressions so implementation code never becomes a CSS selector.
    if (ts.isIdentifier(expr) || ts.isPropertyAccessExpression(expr)) {
      raw = expr.getText(sf);
    } else if (ts.isCallExpression(expr)) {
      const callee = expr.expression;
      if (ts.isIdentifier(callee) || ts.isPropertyAccessExpression(callee)) {
        raw = callee.getText(sf);
      }
    }

    if (!raw) continue;
    const candidate = cleanIdentifier(raw);
    if (isUsefulSemantic(candidate)) names.push(candidate);
  }
  return names;
}

function explicitSemantic(node, tag, sf) {
  const staticPriorityAttrs = [
    "data-semantic", "aria-label", "title", "name", "id", "placeholder", "alt",
    "htmlFor", "role",
  ];

  function staticCandidate(attrName, cleaner = cleanIdentifier) {
    const candidate = cleaner(staticAttrValue(node, attrName, sf));
    return isUsefulSemantic(candidate) ? candidate : "";
  }

  // Buttons/links: visible human text is best.
  if (["button", "a", "summary"].includes(tag)) {
    const text = cleanWords(directText(node, sf), 5);
    if (isUsefulSemantic(text)) return text;
    for (const n of ["data-semantic", "aria-label", "title", "name", "id", "value"]) {
      const v = staticCandidate(n);
      if (v) return v;
    }
    const handlers = expressionNames(node, sf);
    if (handlers.length) return handlers[0];
  }

  // Form controls: stable field identity first. Dynamic `value={...}` is excluded.
  if (["input", "select", "textarea", "option", "label"].includes(tag)) {
    for (const n of ["name", "id", "htmlFor", "aria-label", "placeholder", "title", "value"]) {
      const v = staticCandidate(n);
      if (v) return v;
    }
  }

  // Images: only use static human-authored alt/title text; dynamic expressions are
  // intentionally ignored to avoid classes such as race_name/order_order_name.
  if (tag === "img") {
    for (const n of ["data-semantic", "alt", "aria-label", "title", "id"]) {
      const v = staticCandidate(n, cleanWords);
      if (v) return v;
    }
  }

  for (const n of staticPriorityAttrs) {
    const v = staticCandidate(n);
    if (v && !["button","text","submit","hidden","checkbox","radio"].includes(v)) return v;
  }

  const handlers = expressionNames(node, sf);
  if (handlers.length) return handlers[0];

  return "";
}

function nearestContext(node, sf) {
  let cur = node.parent;
  let depth = 0;
  while (cur && depth < 5) {
    if (ts.isJsxElement(cur)) {
      const open = cur.openingElement;
      const tag = intrinsicTagName(open, sf);
      if (tag) {
        // Context attributes must be static. Dynamic IDs/keys from map loops are not
        // semantic names and are deliberately ignored.
        for (const n of ["data-semantic", "aria-label", "title", "id", "name"]) {
          const v = cleanIdentifier(staticAttrValue(open, n, sf));
          if (isUsefulSemantic(v)) return v;
        }

        // Find a nearby human-readable heading/label in this container.
        for (const child of cur.children) {
          if (!ts.isJsxElement(child)) continue;
          const ctag = intrinsicTagName(child.openingElement, sf);
          if (["h1","h2","h3","h4","label","summary"].includes(ctag)) {
            const txt = cleanWords(directText(child.openingElement, sf), 4);
            if (isUsefulSemantic(txt)) return txt;
          }
        }
      }
    }
    cur = cur.parent;
    depth++;
  }
  return "";
}

function genericRole(tag) {
  const map = {
    a: "link", article: "article", aside: "sidebar", button: "action",
    details: "details", div: "container", footer: "footer", form: "form",
    h1: "title", h2: "heading", h3: "heading", h4: "heading",
    header: "header", img: "image", input: "field", label: "label", li: "item",
    main: "main", nav: "navigation", option: "option", p: "text",
    section: "section", select: "select", span: "text", strong: "emphasis",
    summary: "summary", table: "table", td: "cell", textarea: "field",
    tr: "row", ul: "list",
  };
  return map[tag] ?? "element";
}

function semanticBase(node, tag, sf) {
  const explicit = explicitSemantic(node, tag, sf);
  if (isUsefulSemantic(explicit)) return explicit;
  const context = nearestContext(node, sf);
  if (isUsefulSemantic(context)) return context;
  return genericRole(tag);
}

function findClassName(attributes) {
  return attributes.properties.find(
    (p) => ts.isJsxAttribute(p) && p.name.getText() === "className"
  ) ?? null;
}

function hasToken(text, token) {
  if (!text) return false;
  const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?:^|\\s)${escaped}(?:\\s|$)`).test(text);
}

function preserveQuote(original, value) {
  if (original.startsWith("'")) return `'${value.replaceAll("'", "\\'")}'`;
  return `"${value.replaceAll('"', "&quot;")}"`;
}

function replaceExistingClassName(attr, sf, token) {
  const init = attr.initializer;
  if (!init) {
    return { start: attr.getStart(sf), end: attr.getEnd(), text: `className="${token}"` };
  }
  if (ts.isStringLiteral(init)) {
    if (hasToken(init.text, token)) return null;
    const newValue = `${init.text} ${token}`.trim();
    return {
      start: init.getStart(sf), end: init.getEnd(),
      text: preserveQuote(init.getText(sf), newValue),
    };
  }
  if (ts.isJsxExpression(init)) {
    const expr = init.expression;
    if (!expr) return { start: init.getStart(sf), end: init.getEnd(), text: `{"${token}"}` };
    const exprText = expr.getText(sf);
    if (exprText.includes(token)) return null;
    return {
      start: init.getStart(sf), end: init.getEnd(),
      text: "{`" + "${(" + exprText + ') ?? ""} ' + token + "`}",
    };
  }
  return null;
}

function addNewClassName(node, token) {
  return { start: node.tagName.getEnd(), end: node.tagName.getEnd(), text: ` className="${token}"` };
}

function collectElements(filePath, allowedTags) {
  const source = fs.readFileSync(filePath, "utf8");
  const relative = slash(path.relative(ROOT, filePath));
  const sf = ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const elements = [];

  function visit(node) {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const tag = intrinsicTagName(node, sf);
      if (tag && TARGET_TAGS.has(tag) && allowedTags.has(tag)) {
        elements.push({ node, tag, pos: node.getStart(sf) });
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sf);
  elements.sort((a, b) => a.pos - b.pos);
  return { source, relative, sf, elements };
}

function collectEdits(filePath, allowedTags) {
  const { source, relative, sf, elements } = collectElements(filePath, allowedTags);
  const prefix = classPrefix(relative);
  const used = new Map();
  const edits = [];
  const reportNames = [];
  const counts = new Map();

  for (const { node, tag } of elements) {
    let semantic = cleanWords(semanticBase(node, tag, sf), 6) || genericRole(tag);
    let baseToken = `${prefix}_${tag}_${semantic}`.replace(/_+/g, "_");
    const occurrence = (used.get(baseToken) ?? 0) + 1;
    used.set(baseToken, occurrence);
    const token = occurrence === 1 ? baseToken : `${baseToken}_${occurrence}`;

    const existing = findClassName(node.attributes);
    const edit = existing
      ? replaceExistingClassName(existing, sf, token)
      : addNewClassName(node, token);

    if (edit) {
      edits.push(edit);
      reportNames.push(token);
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }

  return { source, relative, edits, counts, reportNames };
}

function applyEdits(source, edits) {
  let out = source;
  for (const edit of [...edits].sort((a, b) => b.start - a.start)) {
    out = out.slice(0, edit.start) + edit.text + out.slice(edit.end);
  }
  return out;
}

if (!AUDIT_ARG) {
  console.error(
    "ERROR: Please pass the audit file:\n" +
    "  node .\\sepulchria-add-semantic-element-classes.mjs --audit .\\native-elements-audit.txt"
  );
  process.exit(1);
}

const auditPath = path.resolve(ROOT, AUDIT_ARG);
if (!fs.existsSync(auditPath)) {
  console.error(`ERROR: Audit file not found: ${auditPath}`);
  process.exit(1);
}
const auditMap = parseAudit(auditPath);
const files = walkTsx(ROOT).sort((a,b) => slash(a).localeCompare(slash(b)));

let filesConsidered = 0;
let filesChanged = 0;
let elementsChanged = 0;
const totals = new Map();
const report = [];
const missingAuditFiles = [];

for (const [relative] of auditMap) {
  if (!fs.existsSync(path.join(ROOT, relative))) missingAuditFiles.push(relative);
}

for (const filePath of files) {
  const relative = slash(path.relative(ROOT, filePath));
  const allowedTags = auditMap.get(relative);
  if (!allowedTags) continue;
  filesConsidered++;

  const { source, edits, counts, reportNames } = collectEdits(filePath, allowedTags);
  if (!edits.length) continue;

  filesChanged++;
  elementsChanged += edits.length;
  for (const [tag, count] of counts) totals.set(tag, (totals.get(tag) ?? 0) + count);

  report.push({
    relative,
    count: edits.length,
    details: [...counts.entries()].sort(([a],[b]) => a.localeCompare(b))
      .map(([tag,count]) => `${tag}x${count}`).join(", "),
    names: reportNames,
  });

  if (WRITE) fs.writeFileSync(filePath, applyEdits(source, edits), "utf8");
}

console.log("");
console.log(WRITE
  ? "SEPULCHRIA SEMANTIC ELEMENT CLASS PATCH - APPLIED"
  : "SEPULCHRIA SEMANTIC ELEMENT CLASS PATCH - DRY RUN");
console.log("=".repeat(96));

for (const row of report) {
  console.log(row.relative);
  console.log(`  ${row.count} change(s): ${row.details}`);
  if (VERBOSE) for (const name of row.names) console.log(`    ${name}`);
}

console.log("");
console.log("=".repeat(96));
console.log(`Audit entries loaded:     ${auditMap.size}`);
console.log(`TSX files considered:     ${filesConsidered}`);
console.log(`TSX files changed:        ${filesChanged}`);
console.log(`Native elements changed:  ${elementsChanged}`);

if (missingAuditFiles.length) {
  console.log("");
  console.log("WARNING - audit paths not present in the current checkout:");
  for (const file of missingAuditFiles) console.log(`  ${file}`);
}

console.log("");
console.log("Element totals:");
for (const [tag,count] of [...totals.entries()].sort(([a],[b]) => a.localeCompare(b))) {
  console.log(`  ${tag.padEnd(10)} ${count}`);
}

console.log("");
if (!WRITE) {
  console.log(
    "Dry run only: no files changed.\n\n" +
    "To preview every proposed semantic class name, run:\n" +
    "  node .\\sepulchria-add-semantic-element-classes.mjs --audit .\\native-elements-audit.txt --verbose\n\n" +
    "Apply only after reviewing the names:\n" +
    "  node .\\sepulchria-add-semantic-element-classes.mjs --audit .\\native-elements-audit.txt --write"
  );
} else {
  console.log(
    "Patch applied in place.\n\n" +
    "Recommended checks:\n" +
    "  git diff --stat\n" +
    "  git diff\n" +
    "  npm run build\n\n" +
    "To save the resulting Git patch:\n" +
    "  git diff > semantic-element-classes.patch"
  );
}
