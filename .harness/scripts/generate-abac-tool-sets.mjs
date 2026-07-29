#!/usr/bin/env node

/**
 * GT-602 criterion 2 — generate the rego tool sets from the tool registry.
 *
 * ## Why the obvious version was wrong
 *
 * The first attempt sourced the three rego sets from `TOOL_CLASSIFICATION`. That
 * map holds 50 names; the policy needs 62. The twelve-name difference is
 * classified at runtime by `classifyTool`'s FALLBACK — the legacy
 * `READ_TOOLS`/`WRITE_TOOLS`/`DEPLOY_TOOLS` sets — so generating from the map
 * alone would have DELETED them from the policy. Unclassified means ABAC-03,
 * which means denied in production: the exact failure this gap was registered
 * for, reintroduced by its own fix. It was caught by diffing set membership
 * rather than assuming the diff was cosmetic, and nothing was shipped.
 *
 * ## The source of truth is the function, not the map
 *
 * `AbacEvaluator.toolProjection()` enumerates the union of every set the code
 * declares and classifies each name by CALLING `classifyTool`. This generator
 * runs that projection through `ts-node` against the TypeScript source — no
 * build required, and no second implementation of the fallback. A generator that
 * re-read the maps would be a third copy of the logic, which is the disease, not
 * the cure.
 *
 * The name heuristic (`includes('read')`, `includes('write')`, …) applies to
 * names outside every set and is not enumerable. It is deliberately NOT mirrored:
 * dispatch requires native AND opa, so a name only the heuristic knows is denied
 * by the policy and can never be granted by one side alone. The emitted rego says
 * so, rather than looking complete while it is not.
 *
 * Usage:
 *   node .harness/scripts/generate-abac-tool-sets.mjs           # rewrite the rego
 *   node .harness/scripts/generate-abac-tool-sets.mjs --check   # fail on drift
 */

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const NAME = 'generate-abac-tool-sets';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');

const argv = process.argv.slice(2);
const rootIdx = argv.indexOf('--root');
const root = rootIdx !== -1 ? path.resolve(process.cwd(), argv[rootIdx + 1]) : REPO_ROOT;
const CHECK = argv.includes('--check');

const PKG = path.join(root, 'src/packages/mcp-server');
const REGO = path.join(root, 'src/rulesets/opa/abac-mcp-tool-access.rego');

export const CLASSES = ['read', 'write', 'deploy'];
const SET_NAME = { read: 'read_tools', write: 'write_tools', deploy: 'deploy_tools' };

function fail(lines) {
  console.error(`\n✗ ${NAME}: ${lines[0]}`);
  for (const l of lines.slice(1)) console.error(`  ${l}`);
  process.exit(1);
}

/**
 * Ask the runtime, rather than re-reading its data. The entry file is written
 * into the package so its own tsconfig and module resolution apply, and removed
 * afterwards whatever happens.
 */
export function readProjection(pkgDir) {
  const entry = path.join(pkgDir, '__abac-projection.entry.ts');
  fs.writeFileSync(
    entry,
    "import { AbacEvaluator } from './src/mcp/abac-evaluator';\n" +
      'process.stdout.write(JSON.stringify(AbacEvaluator.toolProjection()));\n',
  );
  try {
    const res = spawnSync(
      'npx',
      ['ts-node', '--transpile-only', '-P', 'tsconfig.json', './__abac-projection.entry.ts'],
      { cwd: pkgDir, encoding: 'utf8', timeout: 180000 },
    );
    if (res.status !== 0) {
      fail([
        'could not read the projection from AbacEvaluator.',
        ...String(res.stderr || res.stdout || '').trim().split('\n').slice(-6).map((l) => `  ${l}`),
      ]);
    }
    try {
      return JSON.parse(String(res.stdout).trim());
    } catch {
      fail(['the projection did not parse as JSON — the entry printed something else.']);
    }
  } finally {
    fs.rmSync(entry, { force: true });
  }
}

/** Rewrite one `name := { … }` block, preserving everything around it. */
export function replaceRegoSet(regoSource, setName, tools) {
  const start = regoSource.indexOf(`${setName} := {`);
  if (start < 0) fail([`rego set '${setName}' not found.`]);
  const open = regoSource.indexOf('{', start);
  const close = regoSource.indexOf('}', open);
  if (close < 0) fail([`rego set '${setName}' is not terminated.`]);

  const body = [
    '',
    '  # GENERATED from AbacEvaluator.toolProjection() — do not edit by hand.',
    '  # Regenerate: node .harness/scripts/generate-abac-tool-sets.mjs',
    ...(setName === 'deploy_tools'
      ? [
          "  # NOTE: classifyTool ALSO treats any name containing 'deploy', 'publish'",
          '  # or `merge` as deploy. That heuristic is not enumerable and is NOT',
          '  # mirrored here. Dispatch requires native AND opa, so a name only the',
          '  # heuristic knows is denied by this policy — never granted by one side.',
        ]
      : []),
    // No trailing comma: a rego set literal tolerates it on parse, but keeping the
    // emitted form identical to hand-written rego avoids arguing about it later.
    ...tools.map((t, i) => `  "${t}"${i === tools.length - 1 ? '' : ','}`),
    '',
  ].join('\n');

  return regoSource.slice(0, open + 1) + body + regoSource.slice(close);
}

function main() {
  if (!fs.existsSync(REGO)) fail([`rego policy is missing: ${path.relative(root, REGO)}`]);
  if (!fs.existsSync(path.join(PKG, 'tsconfig.json'))) fail([`mcp-server package not found at ${PKG}`]);

  const projection = readProjection(PKG);
  const byClass = Object.fromEntries(CLASSES.map((c) => [c, []]));
  for (const [tool, klass] of Object.entries(projection)) {
    if (!CLASSES.includes(klass)) {
      fail([`'${tool}' projects to class '${klass}', which the policy does not branch on.`]);
    }
    byClass[klass].push(tool);
  }
  for (const c of CLASSES) byClass[c].sort();

  // Anti-vacuous: emitting empty sets would deny every tool in production.
  const total = CLASSES.reduce((n, c) => n + byClass[c].length, 0);
  if (total === 0) fail(['the projection is EMPTY — the enumerable domain moved and nothing was generated.']);
  for (const c of CLASSES) {
    if (byClass[c].length === 0) fail([`class '${c}' is EMPTY. Every class the policy branches on must have members.`]);
  }

  const before = fs.readFileSync(REGO, 'utf8');
  let after = before;
  for (const c of CLASSES) after = replaceRegoSet(after, SET_NAME[c], byClass[c]);

  console.log(`${NAME} — rego sets derived from AbacEvaluator.toolProjection()`);
  for (const c of CLASSES) console.log(`  ${SET_NAME[c].padEnd(13)} ${String(byClass[c].length).padStart(3)}`);
  console.log(`  total ........ ${total}`);

  if (CHECK) {
    if (after !== before) {
      fail([
        'the rego tool sets have DRIFTED from the runtime projection.',
        '  regenerate with: node .harness/scripts/generate-abac-tool-sets.mjs',
        '',
        '  A tool the runtime classifies and the policy omits is denied at runtime',
        '  while the code says it is allowed — the shape that kept fifteen tools',
        '  FORBIDDEN in production.',
      ]);
    }
    console.log(`\n✓ ${NAME}: the policy matches the runtime (${total} tools).`);
    return;
  }

  fs.writeFileSync(REGO, after);
  console.log(`\n✓ ${NAME}: wrote ${total} tool(s) into ${path.relative(root, REGO)}.`);
}

const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (invokedDirectly) main();
