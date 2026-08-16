#!/usr/bin/env node

/**
 * GT-630 — derived artifacts have a dependency ORDER, and nothing enforced it.
 *
 * ## The defect, observed three times in one day
 *
 * `generate-executive-summary.mjs` reads `maturity-reconciliation.json`, which is
 * itself derived from the gap board. Regenerate the summary BEFORE reconciling
 * and it captures a value the reconciler is about to move. Each artifact's own
 * `--check` then passes at that moment — the summary genuinely matches what was
 * just written — so `ci-runner governance` goes green locally and
 * `Validate documentation` goes red on the runner, where the steps run in the
 * declared order.
 *
 * That is not a stale-artifact bug, which the individual `--check` modes already
 * catch. It is an ORDER bug, and it is invisible to any check that looks at one
 * artifact at a time. It cost three red required checks on 2026-07-28 alone, and
 * the correct sequence was written down nowhere in the repository.
 *
 * ## What this checks
 *
 * The chain is declared as DATA below — producer, the inputs it consumes, the
 * artifact it writes — and this guard walks it in dependency order:
 *
 *   1. Each artifact must be current with respect to its own generator
 *      (`--check`), reported IN ORDER so the first stale one is named with the
 *      command that fixes it. Failing at the first is deliberate: a downstream
 *      artifact built on stale input is not independently wrong.
 *
 *   2. Then the FIXED POINT: replaying the whole chain in order must change
 *      nothing.
 *
 *      Writing the tests for this bounded what it is worth, and the bound is
 *      worth stating. With DETERMINISTIC generators, check (1) already subsumes
 *      (2) — if every link matches what it would write now, a replay is the
 *      identity. The fixed point earns its place on the other failure: a
 *      generator whose output does not depend only on its declared `consumes`.
 *      Then `--check` passes against whatever was last written and only a replay
 *      disagrees. That is the case `46-validate-derived-artifact-order.test.mjs`
 *      exercises, and it is why the pass is kept rather than deleted as
 *      redundant.
 *
 * The fixed-point pass SNAPSHOTS the artifacts, replays the chain in the real
 * tree and restores them byte-for-byte, verifying the restore rather than
 * trusting it. It does not use a copy: the generators resolve paths against a
 * real repository root, and a partial copy fails for the wrong reason — which
 * would turn a genuine order check into a flaky one.
 *
 * ## Anti-vacuous pass
 *
 * A chain with zero links, a declared producer that does not exist, or a
 * declared artifact that is not written by its producer are all hard failures. A
 * guard that verified nothing must never report a pass.
 */

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const GUARD = '46-validate-derived-artifact-order';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../../..');

const argv = process.argv.slice(2);
const rootIdx = argv.indexOf('--root');
const root = rootIdx !== -1 ? path.resolve(process.cwd(), argv[rootIdx + 1]) : REPO_ROOT;
const VERBOSE = argv.includes('--verbose');
const SKIP_FIXED_POINT = argv.includes('--no-fixed-point');

/**
 * GT-703. Walk the chain in order and regenerate every stale link, instead of
 * reporting the first one and stopping there.
 *
 * The reporting behaviour below is NOT the defect and is unchanged. Stopping at the
 * first stale link is what keeps the diagnosis honest — an artifact built on stale
 * input is not independently wrong, and naming it would send you to fix a
 * consequence. What was missing was the other half: with no way to repair the chain
 * locally, each stale link cost a push and a CI cycle to discover. Measured on
 * GT-702's closure — one board row and one closure record produced two red runs
 * (31957356934, 31957550307) before green, for a content delta of three numbers.
 */
const FIX = argv.includes('--fix');

/**
 * The chain, in dependency order. `consumes` is what makes the order real: an
 * entry may only appear after every producer that writes something it reads.
 *
 * Keep this list SHORT and true. A chain that lists artifacts nobody derives is
 * worse than no chain, because it turns a real ordering claim into noise.
 */
/**
 * Artifacts a generator emits ONE PER SOURCE, resolved from disk instead of listed.
 *
 * `generate-adr-rulesets.mjs` writes one conformance ruleset per ADR — 135 files at
 * the time of writing, and one more every time an ADR is authored. Hand-listing them
 * would rot on the next ADR and rot silently, since a `writes` entry that stops
 * existing fails LOUDLY but one that was never added simply is not checked. Reading
 * the directory keeps the declaration true by construction.
 *
 * Returns repo-relative POSIX paths, sorted, so the order is stable across machines.
 */
function emittedPerSource(dir, suffix) {
  const abs = path.join(root, dir);
  // ABSENT is legitimate: a synthetic `--root` has no such tree, and the missing
  // producer is what fails there. EMPTY is not — a directory that exists and yields
  // nothing means the generator's output moved, and returning [] would hand the
  // chain a link that verifies zero artifacts while reporting success. That is the
  // zero-element scan this repo has been bitten by before (GT-557).
  if (!fs.existsSync(abs)) return [];
  const found = fs.readdirSync(abs)
    .filter((f) => f.endsWith(suffix))
    .sort()
    .map((f) => `${dir}/${f}`);
  if (found.length === 0) {
    fail([
      `${dir} exists but holds no ${suffix} files.`,
      'A link that declares zero artifacts checks nothing and still reports success.',
      'Either the generator stopped writing there, or the path moved — fix the declaration.',
    ]);
  }
  return found;
}

const ADR_RULESETS = emittedPerSource('src/rulesets/adr/generated', '.rules.json');

export const CHAIN = [
  {
    name: 'ABAC rego tool sets',
    producer: '.harness/scripts/generate-abac-tool-sets.mjs',
    checkArgs: ['--check'],
    // Derived from the runtime, not from a data file: the producer runs
    // AbacEvaluator.toolProjection() through ts-node, so its real input is the
    // evaluator source. Listed here because a policy generated from a stale
    // classification denies tools in production (GT-602, GT-632).
    consumes: ['src/packages/mcp-server/src/mcp/abac-evaluator.ts'],
    writes: ['src/rulesets/opa/abac-mcp-tool-access.rego'],
  },
  {
    name: 'capability operation schemas',
    producer: '.harness/scripts/generate-capability-operations.mjs',
    checkArgs: ['--check'],
    // Same shape as the ABAC link: derived from the runtime through ts-node.
    // Its real input is the registry that answers `tools/list` plus every tool
    // file the registry aggregates, so the tool module is the honest anchor.
    // Listed because the CLI artifact is generated from the DOMAIN manifest,
    // which is generated from this projection — regenerate out of order and the
    // CLI catalog descends from a manifest nobody published (GT-583).
    consumes: [
      'src/packages/mcp-server/src/mcp/tool-registry.service.ts',
      'src/packages/mcp-server/src/tools/tools.module.ts',
    ],
    writes: [
      'src/packages/core-domain/src/capabilities/capability-operations.generated.ts',
      'src/sdk/cli/src/commands/api/api.catalog.tool-schemas.generated.ts',
    ],
  },
  {
    name: 'ADR conformance rulesets',
    producer: '.harness/scripts/generate-adr-rulesets.mjs',
    checkArgs: ['--check'],
    // Its input is the ADR corpus itself: the generator reads every decision record
    // and emits one conformance ruleset per ADR, lifting the decision text into the
    // rule's `statement`. So editing an ADR's PROSE drifts a generated artifact —
    // which is how a one-word correction to ADR-0126 ("Sixteen" -> "Seventeen") turned
    // `Validate documentation` red on a PR that touched no ruleset at all.
    //
    // It sits HERE, before the snapshot, because the snapshot classifies the whole
    // ruleset corpus and these files are part of it. That edge was already known and
    // written down one link below — "documentation-only moved 129 -> 136 purely
    // because seven generated ADR rulesets appeared" — but only in prose: the
    // generator was not a link, so nothing replayed it in order and `--fix` could not
    // repair it. Declaring it makes the ordering claim machine-checked.
    consumes: ['reference/core/architecture/adrs'],
    writes: ADR_RULESETS,
  },
  {
    name: 'native evaluability snapshot',
    producer: 'src/rulesets/standards/capture-native-evaluability-snapshot.mjs',
    checkArgs: ['--check'],
    // Same shape as the ABAC link: derived from the runtime through ts-node, so
    // its real inputs are Core's triage sources plus the corpus they classify.
    // The corpus half matters — `documentation-only` moved 129 -> 136 purely
    // because seven generated ADR rulesets appeared, and nothing noticed for as
    // long as this file was maintained by hand (GT-598).
    consumes: [
      'src/packages/core-domain/test/rule-corpus-triage.ts',
      'src/packages/core-domain/src/application/validators/rule-evaluability.ts',
      'src/packages/core-domain/src/application/validators/evaluators/native-evaluator.ts',
      // The corpus half, now DECLARED. Listing these turns the sentence above into an
      // assertion: move the ADR link after this one and `validateChainShape` fails
      // with "consumes X, which a LATER link writes" instead of quietly reordering.
      ...ADR_RULESETS,
    ],
    writes: ['src/rulesets/standards/native-evaluability-snapshot.json'],
  },
  {
    name: 'ISO/IEC 5055 corpus mapping',
    producer: 'src/rulesets/standards/build-iso-5055-mapping.mjs',
    checkArgs: ['--check'],
    // THE edge this pair exists for: the generator stamps `nativeEvaluability`
    // onto every row from the snapshot. Rebuild before recapturing and a stale
    // class is laundered into a 391-row artifact, with the handler backlog
    // overstated by exactly the rules Core has closed since the last capture.
    // Both artifacts pass their own --check at that moment, which is precisely
    // the failure one-artifact-at-a-time checking cannot see.
    consumes: ['src/rulesets/standards/native-evaluability-snapshot.json'],
    writes: [
      'src/rulesets/standards/iso-5055-mapping.json',
      'src/rulesets/standards/iso-5055-mapping.csv',
    ],
  },
  {
    name: 'maturity reconciliation',
    producer: '.harness/scripts/ci/09-reconcile-maturity.mjs',
    checkArgs: ['--check'],
    consumes: [
      'reference/core/control-center/gaps/gap-tracking.md',
      'reference/core/control-center/maturity-reports/maturity-assessment.md',
    ],
    writes: ['reference/core/control-center/maturity-reports/maturity-reconciliation.json'],
  },
  {
    name: 'executive governance summary',
    producer: '.harness/scripts/generate-executive-summary.mjs',
    checkArgs: ['--check'],
    // This is the edge that broke: the summary is built FROM the reconciliation.
    consumes: [
      'reference/core/control-center/gaps/gap-tracking.md',
      'reference/core/control-center/maturity-reports/maturity-reconciliation.json',
    ],
    writes: [
      'reference/core/control-center/maturity-reports/executive-summary.md',
      'reference/core/control-center/maturity-reports/executive-summary.es.md',
    ],
  },
  {
    // GT-650 / ADR-0125 — the artifact registry is the single declaration, and this projection is
    // the first consumer to derive from it instead of restating it. Appended rather than placed
    // first: no other link consumes the registry or this constant, so its position is free, and
    // inserting it at the front would have shifted every other link's reported position for no
    // reason — a diff that reads like a reordering when nothing was reordered.
    name: 'universal phase artifacts',
    producer: '.harness/scripts/generate-universal-phase-artifacts.mjs',
    checkArgs: ['--check'],
    consumes: ['src/rulesets/sdlc/artifact-registry.json'],
    writes: ['src/packages/core-domain/src/application/services/universal-phase-artifacts.generated.ts'],
  },
  {
    // GT-650 / ADR-0125 — the served gate corpus stops being a second hand-maintained copy. It
    // consumes BOTH the registry (schema, template, tool-output — properties of the artifact) and
    // the gate corpus (validation prose, roles, waiver authority — properties of the gate), so it
    // sits after the registry projection it shares a source with.
    name: 'served phase-gate corpus',
    producer: '.harness/scripts/generate-phase-gates-rules.mjs',
    checkArgs: ['--check'],
    consumes: [
      'src/rulesets/sdlc/artifact-registry.json',
      'reference/governance/sdlc/gates/gate-f1.json',
    ],
    writes: ['src/rulesets/sdlc/phase-gates.rules.json'],
  },
];

function fail(lines) {
  console.error(`\n✗ ${GUARD}: ${lines[0]}`);
  for (const l of lines.slice(1)) console.error(`  ${l}`);
  process.exit(1);
}

const run = (script, args, cwd) =>
  spawnSync(process.execPath, [path.join(cwd, script), ...args], {
    encoding: 'utf8', cwd, timeout: 180000,
  });

/**
 * How to invoke a producer for WRITING, derived rather than hardcoded: it is the
 * check invocation without the flag that makes it a check. Every link today is
 * `['--check']`, so this is `[]` — but a link that ever needs `['--root', x,
 * '--check']` keeps its `--root` instead of silently losing it. A link may still
 * declare `writeArgs` explicitly if its generator ever stops being symmetric.
 */
export const writeArgsFor = (link) =>
  link.writeArgs ?? link.checkArgs.filter((a) => a !== '--check');

/** Every artifact written by an EARLIER link — the reason the order exists. */
function upstreamArtifacts(index) {
  return new Set(CHAIN.slice(0, index).flatMap((l) => l.writes));
}

function validateChainShape() {
  if (CHAIN.length === 0) {
    fail(['the declared chain is EMPTY — nothing was ordered and nothing was checked.']);
  }
  for (const [i, link] of CHAIN.entries()) {
    if (!fs.existsSync(path.join(root, link.producer))) {
      fail([`declared producer does not exist: ${link.producer}`, 'The chain describes a repository that moved; fix the declaration rather than deleting the link.']);
    }
    for (const w of link.writes) {
      if (!fs.existsSync(path.join(root, w))) {
        fail([`${link.name}: declared artifact is missing: ${w}`]);
      }
    }
    // The ordering claim must be TRUE: a link may not consume something a LATER
    // link writes, or the declared order is a lie and the fixed point is luck.
    const later = new Set(CHAIN.slice(i + 1).flatMap((l) => l.writes));
    for (const c of link.consumes) {
      if (later.has(c)) {
        fail([
          `${link.name} consumes ${c}, which a LATER link writes.`,
          'The declared order contradicts itself — reorder the chain.',
        ]);
      }
    }
  }
}

/**
 * GT-703 — regenerate every stale link, in dependency order, in ONE pass.
 *
 * One pass is sufficient and that is a property of the chain, not luck:
 * `validateChainShape` has already proven no link consumes what a later link
 * writes, so regenerating link i can only invalidate links after i, and those are
 * still ahead of us. Each link is re-checked at the moment we reach it, after every
 * upstream producer has already run.
 *
 * A producer that FAILS stops the pass instead of continuing to the next link. The
 * alternative — carry on and report at the end — would regenerate artifacts on top
 * of an input that never got rebuilt, which is the exact confusion the check-side
 * stop-at-first-stale rule exists to prevent.
 */
function fixChain() {
  const regenerated = [];
  for (const [i, link] of CHAIN.entries()) {
    if (run(link.producer, link.checkArgs, root).status === 0) {
      if (VERBOSE) console.log(`  · ${link.name} already current`);
      continue;
    }
    const args = writeArgsFor(link);
    const res = run(link.producer, args, root);
    if (res.status !== 0) {
      fail([
        `${link.name}: its producer FAILED while regenerating (link ${i + 1} of ${CHAIN.length}).`,
        `  node ${link.producer}${args.length ? ' ' + args.join(' ') : ''}`,
        '',
        ...String(res.stdout || '').trim().split('\n').slice(-6).map((l) => `  ${l}`),
        ...String(res.stderr || '').trim().split('\n').slice(-6).map((l) => `  ${l}`),
        '',
        '  Stopped here rather than continuing: the links after this one consume what',
        '  this was supposed to write, so regenerating them would build on stale input.',
      ]);
    }
    regenerated.push(link.name);
    console.log(`  ↻ regenerated ${link.name}`);
  }
  if (regenerated.length === 0) {
    console.log('  · nothing to regenerate — the chain was already current');
  } else {
    console.log(`  ${regenerated.length} link(s) regenerated, in declared order`);
  }
  return regenerated;
}

function checkCurrency() {
  for (const [i, link] of CHAIN.entries()) {
    const res = run(link.producer, link.checkArgs, root);
    if (res.status !== 0) {
      const upstream = upstreamArtifacts(i);
      const built = link.consumes.filter((c) => upstream.has(c));
      fail([
        `${link.name} is STALE (link ${i + 1} of ${CHAIN.length}).`,
        `  regenerate with: node ${link.producer}`,
        ...(built.length
          ? [`  …but ONLY after its inputs are current: ${built.join(', ')}`]
          : []),
        '',
        ...String(res.stdout || '').trim().split('\n').slice(-4).map((l) => `  ${l}`),
        ...String(res.stderr || '').trim().split('\n').slice(-4).map((l) => `  ${l}`),
        '',
        '  Stopping at the FIRST stale link on purpose: an artifact built on stale',
        '  input is not independently wrong, and fixing it first would hide the cause.',
        '',
        `  To repair the whole chain in declared order: node ${GUARD}.mjs --fix`,
      ]);
    }
    if (VERBOSE) console.log(`  ✓ ${link.name} is current`);
  }
}

/**
 * The order check proper.
 *
 * SNAPSHOT the artifacts, replay the whole chain in order in the real tree, diff
 * against the snapshot, then RESTORE byte-for-byte. Any difference means what is
 * committed was not produced by running the chain in order — exactly the bug the
 * individual `--check` modes cannot see, because each passes against whatever was
 * last written.
 *
 * It runs in the real tree rather than a copy on purpose: the generators resolve
 * paths against a real repository root and a partial copy fails for the wrong
 * reason, which would turn a genuine order check into a flaky one. The restore is
 * exact and verified — a guard that leaves behind what it was measuring cannot
 * report on it. If the process is killed mid-replay the tree is left with
 * REGENERATED artifacts, which is a correct state, not a corrupt one.
 */
function checkFixedPoint() {
  const artifacts = CHAIN.flatMap((l) => l.writes);
  const snapshot = new Map(artifacts.map((rel) => [rel, fs.readFileSync(path.join(root, rel))]));

  const restore = () => {
    for (const [rel, buf] of snapshot) fs.writeFileSync(path.join(root, rel), buf);
  };

  let drifted = [];
  try {
    for (const link of CHAIN) {
      const res = run(link.producer, [], root);
      if (res.status !== 0) {
        restore();
        fail([
          `${link.name} FAILED when the chain was replayed in order.`,
          ...String(res.stderr || res.stdout || '').trim().split('\n').slice(-6).map((l) => `  ${l}`),
        ]);
      }
    }
    for (const link of CHAIN) {
      for (const w of link.writes) {
        if (!fs.readFileSync(path.join(root, w)).equals(snapshot.get(w))) {
          drifted.push({ link: link.name, artifact: w });
        }
      }
    }
  } finally {
    restore();
    // Prove the restore, rather than trusting it.
    for (const [rel, buf] of snapshot) {
      if (!fs.readFileSync(path.join(root, rel)).equals(buf)) {
        fail([`FAILED TO RESTORE ${rel} after the replay — the working tree was left modified.`]);
      }
    }
  }

  if (drifted.length > 0) {
    fail([
      `${drifted.length} artifact(s) differ after replaying the chain IN ORDER:`,
      ...drifted.map((d) => `  • ${d.artifact}  (${d.link})`),
      '',
      '  Each artifact passes its own --check, so nothing is individually stale.',
      '  What is wrong is the ORDER they were produced in: something downstream was',
      '  generated before its input settled, capturing a value that then moved.',
      '',
      '  Fix by regenerating in the declared order:',
      ...CHAIN.map((l, i) => `    ${i + 1}. node ${l.producer}`),
    ]);
  }
}

function main() {
  validateChainShape();

  console.log(`${GUARD} — derived artifacts, in dependency order`);
  console.log(`  links declared ..... ${CHAIN.length}`);
  console.log(`  artifacts covered .. ${CHAIN.flatMap((l) => l.writes).length}`);

  if (FIX) fixChain();

  // Re-checked after --fix on purpose: the pass reports what it regenerated, and
  // this is what proves it. A repair mode trusted on its own say-so is how a chain
  // ends up "fixed" and still stale.
  checkCurrency();
  if (!SKIP_FIXED_POINT) checkFixedPoint();

  console.log(
    `\n✓ ${GUARD}: the chain is current AND at a fixed point` +
    `${SKIP_FIXED_POINT ? ' (fixed point skipped by flag)' : ''} — ` +
    `replaying ${CHAIN.length} link(s) in order changes nothing.`,
  );
}

const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (invokedDirectly) main();
