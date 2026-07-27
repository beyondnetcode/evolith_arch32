#!/usr/bin/env node
/**
 * Plan the npm release of every publishable workspace, in dependency order.
 *
 * WHY THIS EXISTS
 * ---------------
 * Until now the repository had no automated way to publish seven of its eight
 * public packages. `sdk-cli-release.yml` publishes `src/sdk/cli` and nothing
 * else; `ci-cd.yml`'s `publish-npm` published the same directory again, with
 * `--tag beta` and no provenance. Everything else — including
 * `@beyondnet/evolith-mcp`, the package that carries the 2026-07-23 security
 * wave — was published by hand from a developer machine. That is why all eight
 * versions on the registry have no `dist.attestations` (GT-570).
 *
 * The planner is separated from the workflow on purpose: publishing is
 * irreversible, so the decision of WHAT to publish has to be inspectable and
 * testable on its own, without a registry, a token, or a runner.
 *
 * PROPERTIES
 * ----------
 * - **Dependency order.** Topological sort over the internal `@beyondnet/evolith-*`
 *   edges. A consumer is never published before something it depends on, because
 *   the consumer resolves that dependency from the registry.
 * - **Idempotent.** A package whose exact version is already on the registry is
 *   SKIPPED, not republished. A partially failed release can be re-run safely.
 * - **Never vacuous.** Resolving zero publishable packages is an ERROR, not an
 *   empty success. "Nothing to publish because everything is already published"
 *   is a distinct, legitimate outcome and says so.
 * - **Pure core.** `planRelease()` takes data and returns a plan. The I/O — reading
 *   package.json files, asking the registry — lives at the edges so the decision
 *   logic can be tested against fixtures.
 *
 * USAGE
 *   node .harness/scripts/release/plan-npm-release.mjs            # human-readable plan
 *   node .harness/scripts/release/plan-npm-release.mjs --json     # machine-readable
 *   node .harness/scripts/release/plan-npm-release.mjs --offline  # skip registry lookups
 */

import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = join(HERE, '..', '..', '..');

/** Every workspace directory that may hold a publishable package. */
export const WORKSPACE_DIRS = [
  'src/packages/core-domain',
  'src/packages/contracts',
  'src/packages/core',
  'src/packages/agent-runtime',
  'src/packages/infra-providers',
  'src/packages/sdk-client',
  'src/packages/mcp-server',
  'src/sdk/cli',
];

const INTERNAL = /^@beyondnet\/evolith-/;

/**
 * Topologically sort packages so that a dependency always precedes its consumer.
 * Throws on a cycle rather than emitting an arbitrary order — a cycle here would
 * mean an unpublishable graph, and guessing would produce a broken release.
 */
export function dependencyOrder(packages) {
  const byName = new Map(packages.map((p) => [p.name, p]));
  const done = new Set();
  const order = [];

  const visit = (name, stack) => {
    if (done.has(name)) return;
    if (stack.includes(name)) {
      throw new Error(`dependency cycle: ${[...stack, name].join(' -> ')}`);
    }
    const pkg = byName.get(name);
    for (const dep of pkg?.internalDeps ?? []) {
      if (byName.has(dep)) visit(dep, [...stack, name]);
    }
    done.add(name);
    if (pkg) order.push(pkg);
  };

  for (const p of packages) visit(p.name, []);
  return order;
}

/**
 * Decide what to do with each package.
 *
 * @param {Array} packages  - {name, version, dir, internalDeps}
 * @param {Function} isPublished - (name, version) => boolean
 * @returns {{order: Array, toPublish: Array, alreadyPublished: Array, denominator: number}}
 */
export function planRelease(packages, isPublished) {
  if (!Array.isArray(packages) || packages.length === 0) {
    // Never vacuous: an empty scan is a broken planner or a broken checkout, and
    // reporting it as "nothing to do" is how a release pipeline silently ships
    // nothing while printing green.
    throw new Error('resolved zero publishable packages — refusing to emit an empty plan');
  }

  const order = dependencyOrder(packages);
  const toPublish = [];
  const alreadyPublished = [];

  for (const pkg of order) {
    if (isPublished(pkg.name, pkg.version)) alreadyPublished.push(pkg);
    else toPublish.push(pkg);
  }

  return { order, toPublish, alreadyPublished, denominator: order.length };
}

/** Read the publishable packages off disk. Private packages are excluded. */
export function readWorkspacePackages(root = REPO_ROOT, dirs = WORKSPACE_DIRS) {
  const out = [];
  for (const dir of dirs) {
    const manifest = join(root, dir, 'package.json');
    if (!existsSync(manifest)) continue;
    const pkg = JSON.parse(readFileSync(manifest, 'utf8'));
    if (pkg.private) continue;
    const deps = { ...(pkg.dependencies ?? {}), ...(pkg.peerDependencies ?? {}) };
    out.push({
      name: pkg.name,
      version: pkg.version,
      dir,
      internalDeps: Object.keys(deps).filter((d) => INTERNAL.test(d)),
    });
  }
  return out;
}

/** Ask the registry whether an exact version exists. Absent === publishable. */
export function registryLookup(name, version) {
  try {
    const out = execFileSync('npm', ['view', `${name}@${version}`, 'version'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    return out === version;
  } catch {
    return false; // not published, or the registry could not answer
  }
}

function main(argv) {
  const json = argv.includes('--json');
  const offline = argv.includes('--offline');
  const packages = readWorkspacePackages();
  const plan = planRelease(packages, offline ? () => false : registryLookup);

  if (json) {
    process.stdout.write(JSON.stringify({
      denominator: plan.denominator,
      toPublish: plan.toPublish.map(({ name, version, dir }) => ({ name, version, dir })),
      alreadyPublished: plan.alreadyPublished.map(({ name, version }) => ({ name, version })),
    }) + '\n');
    return 0;
  }

  console.log(`Release plan — ${plan.denominator} publishable package(s), dependency order:\n`);
  plan.order.forEach((p, i) => {
    const state = plan.alreadyPublished.includes(p) ? 'already on registry' : 'WILL PUBLISH';
    console.log(`  ${String(i + 1).padStart(2)}. ${p.name.padEnd(36)} ${p.version.padEnd(8)} ${state}`);
  });

  if (plan.toPublish.length === 0) {
    console.log(`\n✓ Nothing to publish: all ${plan.denominator} package versions are already on the registry.`);
  } else {
    console.log(`\n→ ${plan.toPublish.length} of ${plan.denominator} package(s) would be published:`);
    for (const p of plan.toPublish) console.log(`    ${p.name}@${p.version}`);
  }
  return 0;
}

if (process.argv[1] && process.argv[1].endsWith('plan-npm-release.mjs')) {
  try {
    process.exit(main(process.argv.slice(2)));
  } catch (err) {
    console.error(`✗ plan-npm-release: ${err.message}`);
    process.exit(1);
  }
}
