#!/usr/bin/env node

/**
 * GT-651 — the action stays PUBLISHABLE, or this goes red.
 *
 * ## The defect this closes
 *
 * `evolith-validate` was finished work: eight inputs, five outputs, a four-value
 * exit taxonomy, a hermetic test over its own shell and a dogfood workflow that
 * runs it against a deliberately non-conforming satellite. It sat at
 * `.github/actions/evolith-validate/action.yml`, and from there it could never
 * be listed on GitHub Marketplace — not "was not listed", COULD NOT BE:
 *
 *   «Each repository must contain a single action metadata file (action.yml or
 *   action.yaml) at the root»
 *   «[metadata files in subfolders] will not be automatically listed in the
 *   marketplace»
 *      — GitHub, "Publishing an action in GitHub Marketplace",
 *        read against the live page on 2026-08-08.
 *
 * The artifact was not missing and it was not broken. It was standing in the one
 * place the channel does not look, and nothing in this repository could say so,
 * because "publishable" was a property no check had ever been asked about.
 *
 * ## What it checks
 *
 * Every prerequisite that is mechanically checkable from inside the repository:
 *
 *   1. the metadata file is at the ROOT and is the only one there;
 *   2. it declares `name`, `description` and `runs`;
 *   3. `name` is not one of the reserved words GitHub rejects at publish time;
 *   4. `branding.icon` is a Feather name and `branding.color` one of the eight
 *      literals GitHub accepts — a listing attempt with anything else is
 *      rejected, and the rejection arrives at publish time, i.e. at the worst
 *      possible moment;
 *   5. no OTHER action metadata file in the repository claims the same `name`.
 *      Subfolder actions are allowed and stay allowed; two files claiming one
 *      identity is how the root one silently stops being the published one.
 *
 * ## What it deliberately does NOT check
 *
 * Whether the listing EXISTS. Publishing is a human act in GitHub's UI on a
 * release, gated by accepting the Developer Agreement, and it belongs to the
 * repository owner. A guard that claimed to verify it would either call the
 * network from CI or lie. What this guard asserts is narrower and honest:
 * nothing in this repository is standing between the action and that click.
 *
 * ## Anti-vacuous pass
 *
 * The corpus is the root metadata file. A tree without one is a hard failure via
 * `assertScanned`, which is also what makes this guard go red inside
 * `43-validate-guard-negative-fixtures`' empty sandbox. "There is no action" must
 * never read as "the action is fine".
 *
 * USAGE
 *   node .harness/scripts/ci/64-validate-marketplace-action.mjs
 *   node .harness/scripts/ci/64-validate-marketplace-action.mjs --verbose
 *   node .harness/scripts/ci/64-validate-marketplace-action.mjs --root <dir>
 *
 * EXIT CODES
 *   0  every mechanically checkable Marketplace prerequisite holds
 *   1  a prerequisite is broken, or there is no action to check
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

import { assertScanned } from '../lib/coverage.mjs';

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));
const GUARD = '64-validate-marketplace-action';

// --- CLI ---------------------------------------------------------------------

const argv = process.argv.slice(2);
const VERBOSE = argv.includes('--verbose');
const rootIdx = argv.indexOf('--root');
export const ROOT = rootIdx !== -1 ? resolve(process.cwd(), argv[rootIdx + 1]) : resolve(__dirname, '../../..');

// --- GitHub's published constraints ------------------------------------------

/**
 * The eight colors GitHub accepts in `branding.color`. Anything else is rejected
 * when the listing is created, so it is worth catching here — a value that is
 * merely a valid CSS color reads correct in review and fails at publish.
 */
export const BRANDING_COLORS = new Set(['white', 'yellow', 'blue', 'green', 'orange', 'red', 'purple', 'gray-dark']);

/**
 * Names GitHub refuses for a Marketplace listing. The full rule is «cannot match
 * an existing action, a GitHub user or organization (unless you own it), a
 * Marketplace category, or a reserved GitHub feature name» — only the last is
 * knowable offline, so only the last is enforced. The others need the network
 * and would make this guard fail for reasons that have nothing to do with the
 * repository.
 */
export const RESERVED_NAMES = new Set([
  'github',
  'actions',
  'workflow',
  'workflows',
  'marketplace',
  'features',
  'topics',
  'collections',
  'sponsors',
  'codespaces',
  'copilot',
  'packages',
  'security',
  'pages',
  'gist',
  'gists',
]);

/**
 * Feather icon names, which is the set `branding.icon` draws from. Not the whole
 * catalogue — only enough of it to be useful, plus every icon this repository
 * has any reason to use. An icon outside this list is reported as UNVERIFIED
 * rather than as an error: a false red over an icon that is perfectly valid
 * would be worse than the hole, and the failure it guards against (a typo or an
 * invented name) is caught just as well by having to add it here deliberately.
 */
export const KNOWN_ICONS = new Set([
  'activity', 'alert-circle', 'alert-octagon', 'alert-triangle', 'archive', 'award',
  'bar-chart', 'bar-chart-2', 'book', 'book-open', 'box', 'briefcase', 'check',
  'check-circle', 'check-square', 'clipboard', 'code', 'command', 'compass', 'cpu',
  'database', 'eye', 'file-text', 'filter', 'flag', 'git-branch', 'git-commit',
  'git-merge', 'git-pull-request', 'globe', 'grid', 'hash', 'key', 'layers', 'lock',
  'package', 'play', 'search', 'server', 'settings', 'shield', 'shield-off', 'sliders',
  'tag', 'target', 'terminal', 'tool', 'unlock', 'zap',
]);

// --- YAML --------------------------------------------------------------------

/** The monorepo already installs `yaml`; `js-yaml` is the fallback. */
const parseYaml = (() => {
  try {
    const mod = require('yaml');
    return (src) => mod.parse(src);
  } catch {
    /* fall through */
  }
  const mod = require('js-yaml');
  return (src) => mod.load(src);
})();

// --- Discovery ---------------------------------------------------------------

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', 'coverage', '.next', '.turbo']);

/**
 * Every action metadata file in the tree, root first.
 *
 * @param {string} root
 * @returns {string[]} repo-relative paths
 */
export function findActionManifests(root) {
  const found = [];
  const walk = (dir) => {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name)) continue;
        walk(full);
      } else if (entry.name === 'action.yml' || entry.name === 'action.yaml') {
        found.push(relative(root, full));
      }
    }
  };
  walk(root);
  return found.sort((a, b) => a.split('/').length - b.split('/').length || a.localeCompare(b));
}

// --- Rules -------------------------------------------------------------------

/**
 * @typedef {{ level: 'error'|'note', message: string }} Finding
 */

/**
 * Applies every offline-checkable Marketplace prerequisite to a parsed manifest.
 *
 * Pure so the self-test can drive it with hand-built objects instead of
 * scaffolding a repository per case.
 *
 * @param {any} manifest parsed `action.yml`
 * @param {{ path: string, others?: {path: string, name: string}[] }} ctx
 * @returns {Finding[]}
 */
export function checkManifest(manifest, ctx) {
  const findings = [];
  const err = (message) => findings.push({ level: 'error', message });
  const note = (message) => findings.push({ level: 'note', message });

  if (!manifest || typeof manifest !== 'object') {
    err(`${ctx.path} did not parse into a mapping — Marketplace reads this file, so an unparseable one is unlistable.`);
    return findings;
  }

  // 1. Location. The reason the whole gap existed.
  if (ctx.path !== 'action.yml' && ctx.path !== 'action.yaml') {
    err(
      `the manifest is at \`${ctx.path}\`, not the repository root.\n` +
      `      GitHub: «Each repository must contain a single action metadata file at the root».\n` +
      `      A subfolder action is usable via \`uses: owner/repo/path@ref\` and is PERMANENTLY unlistable.`,
    );
  }

  // 2. Required fields.
  for (const field of ['name', 'description', 'runs']) {
    if (manifest[field] === undefined || manifest[field] === null || manifest[field] === '') {
      err(`\`${field}\` is missing — Marketplace requires it and rejects the listing without it.`);
    }
  }

  // 3. Name.
  const name = typeof manifest.name === 'string' ? manifest.name.trim() : '';
  if (name && RESERVED_NAMES.has(name.toLowerCase())) {
    err(`\`name: ${name}\` is a reserved GitHub term; the listing would be rejected at publish time.`);
  }

  // 4. Branding — required to publish, and constrained.
  const branding = manifest.branding;
  if (!branding || typeof branding !== 'object') {
    err(
      'no `branding` block. GitHub requires an icon and a color to create a Marketplace\n' +
      '      listing, and rejects the attempt without them — at publish time, not here.',
    );
  } else {
    if (!branding.color) err('`branding.color` is missing.');
    else if (!BRANDING_COLORS.has(String(branding.color)))
      err(
        `\`branding.color: ${branding.color}\` is not one of GitHub's eight accepted values ` +
        `(${[...BRANDING_COLORS].join(', ')}).`,
      );

    if (!branding.icon) err('`branding.icon` is missing.');
    else if (!KNOWN_ICONS.has(String(branding.icon)))
      note(
        `\`branding.icon: ${branding.icon}\` is not in this guard's Feather list. If it is a real\n` +
        `      Feather icon, add it to KNOWN_ICONS in ${GUARD}.mjs; if it is a typo, GitHub will\n` +
        '      reject the listing.',
      );
  }

  // 5. Identity collision with any other manifest in the tree.
  for (const other of ctx.others ?? []) {
    if (name && other.name && other.name.trim().toLowerCase() === name.toLowerCase()) {
      err(
        `\`${other.path}\` declares the same \`name\` as the root manifest (${name}).\n` +
        '      Subfolder actions are fine; two of them claiming one identity is how the root one\n' +
        '      quietly stops being the thing consumers get.',
      );
    }
  }

  return findings;
}

// --- Main --------------------------------------------------------------------

function main() {
  const manifests = findActionManifests(ROOT);

  // The denominator. A tree with no action metadata file cannot be certified as
  // "publishable" — it has nothing to publish, and saying nothing here is how a
  // deleted or relocated manifest would slip past.
  assertScanned(manifests.length, {
    what: 'GitHub Action metadata files',
    where: 'action.yml / action.yaml anywhere in the repository (root first)',
  });

  const rootPath = join(ROOT, 'action.yml');
  const rootAltPath = join(ROOT, 'action.yaml');
  const rootRel = existsSync(rootPath) ? 'action.yml' : existsSync(rootAltPath) ? 'action.yaml' : null;

  console.log(`${GUARD} — the Marketplace prerequisites this repository controls`);
  console.log(`  metadata files ..... ${manifests.length}`);
  console.log(`  at the root ........ ${rootRel ?? 'NONE'}`);

  if (!rootRel) {
    console.error('');
    console.error(`✗ ${GUARD}: there is no action metadata file at the repository root.`);
    console.error('');
    console.error(`  Found instead: ${manifests.map((m) => `\`${m}\``).join(', ')}`);
    console.error('');
    console.error('  GitHub Marketplace reads the manifest from the root and nowhere else, so every');
    console.error('  one of these is usable cross-repo and none of them is listable. This is exactly');
    console.error('  the state GT-651 closed; if the move was intentional, GT-651 has been reopened');
    console.error('  and should say so.');
    process.exit(1);
  }

  const parsed = new Map();
  for (const rel of manifests) {
    try {
      parsed.set(rel, parseYaml(readFileSync(join(ROOT, rel), 'utf8')));
    } catch (error) {
      parsed.set(rel, null);
      console.error(`  ! ${rel} did not parse: ${error.message}`);
    }
  }

  const others = manifests
    .filter((rel) => rel !== rootRel)
    .map((rel) => ({ path: rel, name: typeof parsed.get(rel)?.name === 'string' ? parsed.get(rel).name : '' }));

  const findings = checkManifest(parsed.get(rootRel), { path: rootRel, others });
  const errors = findings.filter((f) => f.level === 'error');
  const notes = findings.filter((f) => f.level === 'note');

  const manifest = parsed.get(rootRel);
  console.log(`  name ............... ${manifest?.name ?? '(missing)'}`);
  console.log(
    `  branding ........... ${manifest?.branding ? `${manifest.branding.icon} / ${manifest.branding.color}` : '(missing)'}`,
  );
  console.log(`  other manifests .... ${others.length}${others.length ? ` (${others.map((o) => o.path).join(', ')})` : ''}`);

  if (VERBOSE) {
    console.log('');
    console.log('  inputs:');
    for (const key of Object.keys(manifest?.inputs ?? {})) console.log(`    - ${key}`);
  }

  console.log('');
  for (const note of notes) console.log(`  note: ${note.message}`);

  if (errors.length) {
    console.error('');
    console.error(`✗ ${GUARD}: ${errors.length} prerequisite(s) broken — the action is not publishable.`);
    console.error('');
    for (const finding of errors) console.error(`  ✗ ${finding.message}`);
    console.error('');
    console.error('  Reference: GitHub, "Publishing an action in GitHub Marketplace".');
    process.exit(1);
  }

  console.log(`✓ ${GUARD}: every prerequisite this repository controls is satisfied.`);
  console.log('  (The listing itself is a human publish step on a release, owned by the repository');
  console.log('   owner — this guard asserts nothing here is blocking it, not that it happened.)');
}

const invokedDirectly = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (invokedDirectly) {
  try {
    main();
  } catch (error) {
    console.error(`✗ ${GUARD}: ${error.message}`);
    process.exit(1);
  }
}
