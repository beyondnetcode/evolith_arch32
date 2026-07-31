#!/usr/bin/env node

/**
 * GT-642 — a runtime import cycle fails the build, in EVERY workspace package.
 *
 * ## Why this exists
 *
 * Two runtime import cycles reached a 346-module package unseen, and were found by hand
 * ([`GT-641`](../../../reference/core/control-center/gaps/gap-reference-catalog.md#gt-641)).
 * They were unseen because nothing looks:
 *
 *   - `lint:boundaries` enforces DIRECTION between layers, not acyclicity. It was green
 *     for both, because `services/index.ts` and `use-cases/` are the same layer.
 *   - `tsc` compiles a `require` cycle without a diagnostic. At runtime it resolves to a
 *     partially-initialised module — a defect that surfaces as `undefined` at import time,
 *     never as a compile error.
 *   - no governance guard read the module graph at all.
 *
 * ## This guard writes no detector
 *
 * The measurement already exists: `GT-589` shipped `@beyondnet/evolith-repo-facts`
 * (the TypeScript fact extractor) and `findImportCycles` (Tarjan over the module graph,
 * in `@beyondnet/evolith-core-domain`). A second cycle detector living beside the first
 * would be the double-source-of-truth defect GT-589 was built to remove. This file is
 * WIRING: enumerate the workspace, run that extractor and that query, report.
 *
 * ## Runtime vs type-only, and why the flag is not the gate
 *
 * `ImportCycle.typeOnly` is true only when EVERY edge of the chain is type-only. That is
 * a correct description and the wrong gate for a build-breaking check, because a cycle
 * whose edges are MIXED — one value import, one `import type` — is reported `typeOnly:
 * false` while not existing at runtime at all: the erased edge never closes the loop for
 * `require`. Observed on the very first monorepo run: `src/sdk/cli` has exactly one such
 * cycle (`api.catalog.generated.ts` ⇄ `api.catalog.ts`, the value edge one way and
 * `import type` the other). Gating on the flag would have failed the build on day one for
 * a cycle that cannot occur.
 *
 * So the question is asked of the graph instead of the flag, using the SAME query:
 *
 *   FATAL      findImportCycles over the RUNTIME SUBGRAPH — the same facts with
 *              type-only edges removed. A cycle that survives erasure is a real one.
 *   REPORTED   cycles over the FULL graph that are absent from the fatal set — they
 *              close only through an edge the compiler deletes.
 *
 * Criterion 2 of the row asks for exactly this split, and its reasoning is the reason the
 * reported half must stay LOUD: if type-only cycles broke the build, the cheapest fix
 * would be to write `import type` on the return edge, which silences the guard while
 * leaving the inverted layering in place. Here that move does not delete the finding, it
 * moves it one column left, where it is still counted and still named.
 *
 * ## Chain AND component
 *
 * Both are printed, because GT-641 proved the chain alone produces the WRONG FIX. Its two
 * chains named two modules each; the strongly connected components were four modules each
 * (`project-scaffolder.service` and `phase-transition.use-case` in one,
 * `evidence-validator` and `ruleset-loader` in the other). Repointing only the modules the
 * chain names would have relocated each cycle rather than broken it.
 *
 * ## Anti-vacuous pass
 *
 * The workspace list is DERIVED from the root `package.json` globs, never hand-written, so
 * a package added next month is covered the day it lands and cannot be quietly omitted.
 * Zero packages discovered is a hard exit 1; so is any single package yielding zero
 * modules, asserted per-package through `assertScannedPerSource` rather than on the total.
 * Per-package is the point: a monorepo total of 1009 modules looks healthy while one
 * package's `src/` has moved and contributes nothing, which is precisely how a guard ends
 * up reporting on ten packages and believing it reported on eleven.
 *
 * A missing `@beyondnet/evolith-repo-facts` build is a hard failure with instructions, not
 * a skip. A guard that quietly does nothing when its tool is absent is the defect this
 * backlog is about.
 *
 * Usage:
 *   node .harness/scripts/ci/54-validate-import-cycles.mjs
 *   node .harness/scripts/ci/54-validate-import-cycles.mjs --verbose
 *   node .harness/scripts/ci/54-validate-import-cycles.mjs --report <path.json>
 *
 * Exit codes:
 *   0 - no runtime import cycle in any workspace package (type-only-closed cycles, if
 *       any, are listed and are not fatal)
 *   1 - a runtime cycle, a package that yielded no modules, an empty workspace, or a
 *       missing extractor build
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve as resolvePath } from 'node:path';
import { assertScanned, assertScannedPerSource } from '../lib/coverage.mjs';
import { REPO_ROOT, resolve, relativeToRoot } from '../lib/paths.mjs';

const GUARD = '54-validate-import-cycles';

const argv = process.argv.slice(2);
const VERBOSE = argv.includes('--verbose');
const reportIdx = argv.indexOf('--report');
const REPORT_PATH = reportIdx !== -1 && argv[reportIdx + 1] ? resolvePath(process.cwd(), argv[reportIdx + 1]) : null;

/** Directory names the extractor must not walk into. Mirrors its own defaults. */
const EXCLUDE = ['node_modules', 'dist', 'coverage', '.git', '.harness'];

/**
 * Load GT-589's extractor and GT-641's query from the BUILT packages.
 *
 * `createRequire` is anchored at the repo root so resolution walks this repository's
 * `node_modules` — which, in a git worktree, is the difference between measuring this
 * tree and silently measuring the main checkout through a stray symlink.
 */
function loadFactBase() {
  const require_ = createRequire(join(REPO_ROOT, 'noop.mjs'));
  const missing = (name, workspace) =>
    new Error(
      `${GUARD}: cannot load '${name}'.\n` +
        `  This guard runs GT-589's extractor rather than reimplementing one, so without the\n` +
        `  built package it has nothing to run and MUST NOT report "no cycles found".\n` +
        `  Build it first:  npm run build --workspace ${workspace}`,
    );

  let extractor;
  let contracts;
  try {
    extractor = require_('@beyondnet/evolith-repo-facts');
  } catch {
    throw missing('@beyondnet/evolith-repo-facts', '@beyondnet/evolith-repo-facts');
  }
  try {
    contracts = require_('@beyondnet/evolith-core-domain/evaluation/contracts');
  } catch {
    throw missing('@beyondnet/evolith-core-domain/evaluation/contracts', '@beyondnet/evolith-core-domain');
  }
  if (typeof extractor.extractTypeScriptFacts !== 'function') {
    throw missing('@beyondnet/evolith-repo-facts → extractTypeScriptFacts', '@beyondnet/evolith-repo-facts');
  }
  if (typeof contracts.findImportCycles !== 'function') {
    throw missing('@beyondnet/evolith-core-domain → findImportCycles', '@beyondnet/evolith-core-domain');
  }
  return { extractTypeScriptFacts: extractor.extractTypeScriptFacts, findImportCycles: contracts.findImportCycles };
}

/**
 * Every workspace package, DERIVED from the root package.json globs.
 *
 * Only trailing `*` is supported, which is every form this repository uses; anything
 * else throws rather than silently matching nothing.
 */
export function discoverWorkspacePackages(root) {
  const manifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  const patterns = Array.isArray(manifest.workspaces) ? manifest.workspaces : (manifest.workspaces?.packages ?? []);
  const found = [];
  for (const pattern of patterns) {
    if (pattern.includes('*')) {
      if (!pattern.endsWith('/*')) {
        throw new Error(`${GUARD}: unsupported workspace pattern '${pattern}' — only a trailing '/*' is understood.`);
      }
      const parent = join(root, pattern.slice(0, -2));
      if (!existsSync(parent)) continue;
      for (const entry of readdirSync(parent, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
        if (!entry.isDirectory()) continue;
        const dir = join(parent, entry.name);
        if (existsSync(join(dir, 'package.json'))) found.push(dir);
      }
      continue;
    }
    const dir = join(root, pattern);
    if (existsSync(join(dir, 'package.json'))) found.push(dir);
  }
  return [...new Set(found)].sort();
}

/** A cycle's identity, for set arithmetic between the full and runtime graphs. */
const cycleKey = (cycle) => cycle.component.join('|');

function analysePackage(dir, { extractTypeScriptFacts, findImportCycles }) {
  const name = relativeToRoot(dir);
  const sourceDir = join(dir, 'src');
  if (!existsSync(sourceDir) || !statSync(sourceDir).isDirectory()) {
    // Reported, not skipped in silence: a workspace package with no `src/` is either a
    // fixture holder or a layout change, and both deserve a line in the table.
    return { package: name, modules: 0, imports: 0, noSource: true, runtime: [], typeOnly: [] };
  }

  const facts = extractTypeScriptFacts({ rootDir: dir, include: ['src'], exclude: EXCLUDE });

  // The FULL graph — every import edge, erased or not.
  const all = findImportCycles(facts);
  // The RUNTIME subgraph — the same facts with type-only edges dropped. `contentHash` is
  // not recomputed and is not read by the query; this value never leaves this function.
  const runtime = findImportCycles({ ...facts, imports: facts.imports.filter((edge) => !edge.typeOnly) });

  const runtimeKeys = new Set(runtime.map(cycleKey));
  const typeOnly = all.filter((cycle) => !runtimeKeys.has(cycleKey(cycle)));

  return {
    package: name,
    modules: facts.modules.length,
    imports: facts.imports.length,
    noSource: false,
    runtime: runtime.map((c) => ({ chain: c.chain, component: c.component })),
    typeOnly: typeOnly.map((c) => ({ chain: c.chain, component: c.component, allEdgesTypeOnly: c.typeOnly })),
  };
}

const renderCycle = (cycle, indent) =>
  `${indent}chain ..... ${cycle.chain.join(' → ')}\n` +
  `${indent}component . ${cycle.component.join(', ')}${
    cycle.component.length > cycle.chain.length - 1 ? '   ← WIDER THAN THE CHAIN: fix the component, not the chain' : ''
  }`;

function main() {
  const factBase = loadFactBase();
  const root = resolve('rootPackageJson').replace(/\/package\.json$/, '');
  const packages = discoverWorkspacePackages(root);

  assertScanned(packages.length, {
    what: 'workspace packages',
    where: 'package.json → workspaces',
  });

  const results = packages.map((dir) => analysePackage(dir, factBase));

  // Per-package, never on the total: one package contributing nothing must fail even
  // when the monorepo total looks healthy.
  const moduleCounts = {};
  for (const r of results) {
    if (r.noSource) continue;
    moduleCounts[r.package] = r.modules;
  }
  assertScannedPerSource(moduleCounts, { what: 'TypeScript modules' });

  const withRuntime = results.filter((r) => r.runtime.length > 0);
  const withTypeOnly = results.filter((r) => r.typeOnly.length > 0);
  const totalModules = results.reduce((a, r) => a + r.modules, 0);
  const totalRuntime = results.reduce((a, r) => a + r.runtime.length, 0);
  const totalTypeOnly = results.reduce((a, r) => a + r.typeOnly.length, 0);

  if (REPORT_PATH) {
    mkdirSync(dirname(REPORT_PATH), { recursive: true });
    writeFileSync(
      REPORT_PATH,
      `${JSON.stringify(
        {
          schemaVersion: '1.0',
          guard: GUARD,
          gap: 'GT-642',
          extractor: '@beyondnet/evolith-repo-facts (GT-589)',
          query: 'findImportCycles (@beyondnet/evolith-core-domain/evaluation/contracts)',
          packagesScanned: results.length,
          totals: { modules: totalModules, runtimeCycles: totalRuntime, typeOnlyCycles: totalTypeOnly },
          packages: results,
        },
        null,
        2,
      )}\n`,
    );
  }

  // --- The table. Printed on EVERY run, clean packages included ------------------
  // A guard whose passing run reports nothing is indistinguishable from one that
  // cannot run, so the zeros are the evidence and not noise.
  const width = Math.max(...results.map((r) => r.package.length));
  const header = totalRuntime > 0 ? console.error.bind(console) : console.log.bind(console);
  header(`${totalRuntime > 0 ? '✗' : '✅'} ${GUARD} — import cycles across every workspace package`);
  header(`  ${'package'.padEnd(width)}  modules  imports  runtime  type-only`);
  for (const r of results) {
    const suffix = r.noSource ? '  (no src/ — nothing to measure)' : '';
    header(
      `  ${r.package.padEnd(width)}  ${String(r.modules).padStart(7)}  ${String(r.imports).padStart(7)}  ` +
        `${String(r.runtime.length).padStart(7)}  ${String(r.typeOnly.length).padStart(9)}${suffix}`,
    );
  }
  header(
    `  ${'TOTAL'.padEnd(width)}  ${String(totalModules).padStart(7)}  ` +
      `${String(results.reduce((a, r) => a + r.imports, 0)).padStart(7)}  ` +
      `${String(totalRuntime).padStart(7)}  ${String(totalTypeOnly).padStart(9)}`,
  );

  // --- Type-only: loud, listed, and not fatal ------------------------------------
  if (totalTypeOnly > 0) {
    console.log(`\n  ${totalTypeOnly} cycle(s) close ONLY through an edge the compiler erases — reported, NOT fatal.`);
    console.log(`  They are still inverted layering. Do not "fix" a runtime cycle by moving it here.`);
    for (const r of withTypeOnly) {
      for (const cycle of r.typeOnly) {
        console.log(`    • ${r.package}`);
        console.log(renderCycle(cycle, '        '));
        if (!cycle.allEdgesTypeOnly) {
          console.log(`        note ...... mixed edges: real one way, erased the other, so no require() loop exists`);
        }
      }
    }
  }

  if (totalRuntime === 0) {
    if (VERBOSE) {
      console.log(`\n  extractor .. @beyondnet/evolith-repo-facts (GT-589)`);
      console.log(`  query ...... findImportCycles over the runtime subgraph (type-only edges removed)`);
      if (REPORT_PATH) console.log(`  report ..... ${relativeToRoot(REPORT_PATH)}`);
    }
    return;
  }

  console.error(`\n  ${totalRuntime} RUNTIME import cycle(s) in ${withRuntime.length} package(s):\n`);
  for (const r of withRuntime) {
    for (const cycle of r.runtime) {
      console.error(`  • ${r.package}`);
      console.error(renderCycle(cycle, '      '));
      console.error(
        `      A require() cycle resolves to a partially-initialised module, so this fails at\n` +
          `      import time as 'undefined' and never as a compile error. Break it where the\n` +
          `      inversion starts — move the shared TYPE out — rather than by writing\n` +
          `      'import type' on the return edge, which only hides the coupling.\n`,
      );
    }
  }
  process.exit(1);
}

main();
