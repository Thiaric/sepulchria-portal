const fs = require("fs");
const path = require("path");
const cp = require("child_process");
const ts = require("typescript");
const postcss = require("postcss");

const ROOT = process.cwd();
const EXPECTED_HEAD = "74f9bb8afe3cc723e86f215fe03c3e166546e63a";
const SLUG = "pioneers-land";
const MARKER = "/* PIONEERS' LAND SKIN */";

function sh(...args) {
  return cp.execFileSync(args[0], args.slice(1), {
    cwd: ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function stop(msg) {
  console.error("\nSTOPPED:", msg);
  process.exit(1);
}

let head;
try {
  head = sh("git", "rev-parse", "HEAD");
} catch {
  stop("Run this from the sepulchria-portal repository root.");
}

if (head !== EXPECTED_HEAD) {
  stop(`Expected HEAD ${EXPECTED_HEAD.slice(0, 7)}, found ${head.slice(0, 7)}.`);
}

try {
  cp.execFileSync("git", ["diff", "--quiet"], { cwd: ROOT });
  cp.execFileSync("git", ["diff", "--cached", "--quiet"], { cwd: ROOT });
} catch {
  stop("Tracked files are already modified. Commit/stash them, or reset before running this patch.");
}

const backupRoot = path.join(ROOT, ".pioneers-land-backup");
if (fs.existsSync(backupRoot)) fs.rmSync(backupRoot, { recursive: true, force: true });
fs.mkdirSync(backupRoot, { recursive: true });

const changed = [];

function backup(file) {
  const rel = path.relative(ROOT, file);
  const dest = path.join(backupRoot, rel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(file, dest);
}

function writeIfChanged(file, original, next) {
  if (next === original) return;
  backup(file);
  fs.writeFileSync(file, next, "utf8");
  changed.push(file);
}

function restoreAll() {
  for (const file of changed) {
    const src = path.join(backupRoot, path.relative(ROOT, file));
    if (fs.existsSync(src)) fs.copyFileSync(src, file);
  }
}

const skinOverride = `
${MARKER}
html[data-portal-skin="${SLUG}"],
body[data-portal-skin="${SLUG}"],
.portal-skin-scope[data-portal-skin="${SLUG}"] {
  /* C1 — elegant warm gold */
  --sep-skin-c1: 208 170 88;
  /* C2 — refined bronze */
  --sep-skin-c2: 177 120 69;
  --sep-skin-nav-link: 208 170 88;
  --sep-skin-nav-icon-filter: brightness(0) saturate(100%) invert(73%) sepia(45%) saturate(749%) hue-rotate(359deg) brightness(91%) contrast(86%);

  /* Charcoal foundation. These override Emberforge's brown base while
     preserving the existing portal's depth hierarchy. */
  --sep-colour-050403: 12 13 15;
  --sep-colour-090705: 15 16 18;
  --sep-colour-090706: 15 16 18;
  --sep-colour-0b0806: 17 18 20;
  --sep-colour-0b0807: 17 18 20;
  --sep-colour-0c0907: 18 19 21;
  --sep-colour-0d0907: 19 20 22;
  --sep-colour-0d0a08: 20 21 23;
  --sep-colour-0d0b0a: 20 21 23;
  --sep-colour-0e0a08: 21 22 24;
  --sep-colour-0f0b08: 22 23 25;
  --sep-colour-100c09: 23 24 26;
  --sep-colour-110c09: 24 25 27;
  --sep-colour-120d09: 24 25 27;
  --sep-colour-120d0a: 25 26 28;
  --sep-colour-120f0d: 26 27 30;
  --sep-colour-130e0b: 27 28 30;
  --sep-colour-15100c: 28 29 32;
  --sep-colour-15100d: 29 30 33;
  --sep-colour-16100c: 30 31 34;
  --sep-colour-17100c: 30 31 34;
  --sep-colour-17110d: 31 32 35;
  --sep-colour-17120f: 32 33 36;
  --sep-colour-18110d: 33 34 37;
  --sep-colour-19120d: 34 35 38;
  --sep-colour-1a120d: 35 36 39;
  --sep-colour-1b130d: 36 37 40;
  --sep-colour-1b140f: 37 38 41;
  --sep-colour-1d150f: 39 40 43;
  --sep-colour-20170f: 41 42 45;
  --sep-colour-21170f: 42 43 46;
  --sep-colour-21190f: 43 44 47;
  --sep-colour-24180f: 44 45 48;
  --sep-colour-261b12: 46 47 50;
  --sep-colour-2a1d12: 49 50 53;
  --sep-colour-2b1d12: 50 51 54;
  --sep-colour-332317: 55 56 59;
  --sep-colour-3b2919: 62 63 66;
}
`;

try {
  // 1) CSS: inherit Emberforge's existing dark-skin behavioural rules,
  // then override its palette with Pioneers' Land's gold/bronze/charcoal.
  const cssFiles = [
    path.join(ROOT, "components", "sepulchria", "sep-ui-unified.css"),
    path.join(ROOT, "app", "portal-themes.css"),
  ].filter(fs.existsSync);

  let inheritedAnywhere = false;

  for (const file of cssFiles) {
    const original = fs.readFileSync(file, "utf8");

    if (original.includes(MARKER)) {
      stop(`${path.relative(ROOT, file)} already contains Pioneers' Land.`);
    }

    let next = original;

    if (next.includes('[data-portal-skin="emberforge"]')) {
      inheritedAnywhere = true;
      next = next.replaceAll(
        '[data-portal-skin="emberforge"]',
        ':is([data-portal-skin="emberforge"], [data-portal-skin="pioneers-land"])'
      );
    }

    next += skinOverride;

    // Syntax validation before writing.
    postcss.parse(next, { from: file });
    writeIfChanged(file, original, next);
  }

  if (!inheritedAnywhere) {
    throw new Error('Could not find the Emberforge skin selectors to inherit.');
  }

  // 2) Special activity accents: use C1-equivalent gold so Crafting,
  // Gathering and House of Chances do not fall back to another skin's accent.
  const accentFiles = [
    path.join(ROOT, "app", "(portal)", "crafting", "crafting-workbench.tsx"),
    path.join(ROOT, "app", "(portal)", "game", "components", "GatheringPanel.tsx"),
    path.join(ROOT, "app", "(portal)", "game", "components", "HouseOfChancesPanel.tsx"),
  ];

  for (const file of accentFiles) {
    if (!fs.existsSync(file)) throw new Error(`Missing expected file: ${path.relative(ROOT, file)}`);

    const original = fs.readFileSync(file, "utf8");
    if (original.includes('"pioneers-land"')) continue;

    const needle = '  emberforge: "#d27b35",';
    if (!original.includes(needle)) {
      throw new Error(`Could not locate Emberforge accent map in ${path.relative(ROOT, file)}`);
    }

    const next = original.replace(
      needle,
      `${needle}\n  "pioneers-land": "#d0aa58",`
    );

    const kind =
      file.endsWith(".tsx") ? ts.ScriptKind.TSX :
      file.endsWith(".ts") ? ts.ScriptKind.TS :
      ts.ScriptKind.JS;

    const sf = ts.createSourceFile(file, next, ts.ScriptTarget.Latest, true, kind);
    if (sf.parseDiagnostics.length) {
      throw new Error(`TypeScript parse failed after patching ${path.relative(ROOT, file)}`);
    }

    writeIfChanged(file, original, next);
  }

  // Final validation of every touched CSS/TSX file.
  for (const file of changed) {
    const text = fs.readFileSync(file, "utf8");
    if (file.endsWith(".css")) {
      postcss.parse(text, { from: file });
    } else if (/\.(ts|tsx|js|jsx)$/.test(file)) {
      const kind = file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
      const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, kind);
      if (sf.parseDiagnostics.length) throw new Error(`Final TypeScript parse failed: ${path.relative(ROOT, file)}`);
    }
  }

  console.log("\nPIONEERS' LAND PATCH COMPLETE");
  console.log("Slug: pioneers-land");
  console.log("C1: #D0AA58 (gold)");
  console.log("C2: #B17845 (bronze)");
  console.log("Background: layered charcoal");
  console.log("");
  console.log("Changed files:");
  for (const file of changed) console.log("  " + path.relative(ROOT, file));
  console.log("");
  console.log("Backup: .pioneers-land-backup/");
  console.log("NEXT: run npm run build");
} catch (err) {
  restoreAll();
  console.error("\nPATCH FAILED. Modified tracked files were restored.");
  stop(err && err.stack ? err.stack : String(err));
}
