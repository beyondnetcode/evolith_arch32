#!/usr/bin/env node
/**
 * GT-705 — bundle the Core corpus into the MCP package, so an installed
 * `@beyondnet/evolith-mcp` can answer the tools it announces.
 *
 * Measured on the published 1.2.2 by GT-671's canary: `tools/list` returns 50
 * tools, and from a clean npm prefix `evolith-gate-evaluate` answers
 * RULESET_NOT_FOUND while `evolith-validate` answers "could not locate the
 * Evolith ruleset corpus". Only `evolith-metrics`, which needs no corpus, worked.
 * The manifest said why: `files: ["dist/", "README.md", "LICENSE"]`, and none of
 * the five `@beyondnet/*` dependencies ships a corpus either.
 *
 * TWO TREES, because the server needs both and they are not the same thing:
 *   - `<repo>/src/rulesets`                     → `<mcp>/rulesets`
 *   - `<repo>/reference/governance/sdlc/gates`  → `<mcp>/reference/governance/sdlc/gates`
 * The first is what `resolveCorpus` qualifies; the second is what
 * `PhaseGateValidatorService` reads at `<core>/reference/governance/sdlc/gates`.
 * Shipping one without the other is how `evolith-validate` could work while
 * `evolith-gate-evaluate` still could not.
 *
 * The skip is VERIFIED, never taken on faith — that is the CLI's own lesson
 * (`copy-rulesets.js`): running inside `prepublishOnly`, a script that assumes
 * "already bundled?" publishes whatever happened to be on disk, or nothing, and
 * reports success either way.
 */
const fs = require('fs');
const path = require('path');

const pkgRoot = path.resolve(__dirname, '..');
// <mcp> = src/packages/mcp-server → the repository root is three levels up.
const repoRoot = path.resolve(pkgRoot, '..', '..', '..');

const TREES = [
  { from: path.join(repoRoot, 'src', 'rulesets'), to: path.join(pkgRoot, 'rulesets'), label: 'ruleset corpus' },
  {
    from: path.join(repoRoot, 'reference', 'governance', 'sdlc', 'gates'),
    to: path.join(pkgRoot, 'reference', 'governance', 'sdlc', 'gates'),
    label: 'SDLC gate definitions',
  },
];

/** A corpus is identified by CONTENT, matching `resolveCorpus`. */
const CORPUS_MARKERS = new Set(['schema', 'architecture', 'topologies', 'sdlc', 'governance', 'acl', 'opa']);

function copyDir(from, to) {
  if (!fs.existsSync(to)) fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const src = path.join(from, entry.name);
    const dst = path.join(to, entry.name);
    if (entry.isDirectory()) copyDir(src, dst);
    else if (entry.isFile()) fs.copyFileSync(src, dst);
  }
}

function qualifies(dir, markers) {
  if (!fs.existsSync(dir)) return false;
  const entries = fs.readdirSync(dir);
  return markers ? entries.some((e) => markers.has(e)) : entries.length > 0;
}

let copied = 0;
for (const tree of TREES) {
  const markers = tree.label === 'ruleset corpus' ? CORPUS_MARKERS : undefined;

  if (fs.existsSync(tree.from)) {
    copyDir(tree.from, tree.to);
    copied += 1;
    console.log(`[copy-corpus] ${tree.label} → ${path.relative(pkgRoot, tree.to)}`);
    continue;
  }

  // No source tree. That is legitimate in an installed/detached context, where
  // the trees are already bundled — but it is VERIFIED, not assumed.
  if (qualifies(tree.to, markers)) {
    console.log(`[copy-corpus] ${tree.label} already bundled (source tree absent) — verified`);
    continue;
  }

  console.error(
    `[copy-corpus] FAILED: no ${tree.label} at ${tree.from}, and nothing usable already bundled at ${tree.to}.\n`
    + '  Publishing from here would ship a server that announces its tools and cannot answer them (GT-705).',
  );
  process.exit(1);
}

if (copied === 0 && TREES.every((t) => !fs.existsSync(t.from))) {
  console.log('[copy-corpus] nothing copied; both trees verified as already bundled');
}
