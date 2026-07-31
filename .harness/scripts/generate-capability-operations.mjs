#!/usr/bin/env node

/**
 * GT-583 — one registry, three surfaces, generated.
 *
 * ## What was wrong
 *
 * The same contract was written down three times and reconciled by hand:
 *
 *  - `TOOL_SCHEMAS` in `src/sdk/cli/src/commands/api/api.catalog.ts` — a
 *    hand-written map that held THREE entries against fifty registered tools,
 *    keyed `gate-evaluate` while the tool is called `evolith-gate-evaluate`, and
 *    naming one operation (`agent-create`) that does not exist at all. Every
 *    `evolith api --inspect` of a real tool answered "not found".
 *  - the `inputSchema` literal inside every MCP tool file.
 *  - the capability manifest, which published no per-operation schema at all.
 *
 * ## The source is the registry, not the wire
 *
 * `ToolRegistryService.operationProjection()` asks the registry that actually
 * answers `tools/list` to describe itself, including everything
 * `ToolRegistryService.describe()` derives (output envelope, annotations,
 * `baseSha`, dialect). This generator CALLS that function through `ts-node`
 * against the TypeScript source — the shape GT-602 established with
 * `AbacEvaluator.toolProjection()` — and never re-reads the tool files.
 *
 * It deliberately does NOT drive the MCP server over stdio and read
 * `tools/list`, the way `gen-api-catalog.mjs` does: `handleListTools` filters
 * the inventory by the ambient principal's scopes (GT-609), so a generator fed
 * from the wire emits whatever subset the generating principal happened to see.
 * That is GT-602's documented trap — a generator fed from the wrong source
 * silently DELETED nine tools, which in production means denied — in its MCP
 * form. The count assertion below is the guard that would catch it anyway.
 *
 * ## What it writes
 *
 *  1. `src/packages/core-domain/src/capabilities/capability-operations.generated.ts`
 *     — the catalog `buildCapabilityManifest()` publishes as `operations`.
 *  2. `src/sdk/cli/src/commands/api/api.catalog.tool-schemas.generated.ts`
 *     — `TOOL_SCHEMAS`, built FROM THE MANIFEST (the generator calls
 *     `buildCapabilityManifest({ operations })`, so the CLI's copy provably
 *     descends from the published contract rather than from the registry twice).
 *
 * Usage:
 *   node .harness/scripts/generate-capability-operations.mjs           # rewrite
 *   node .harness/scripts/generate-capability-operations.mjs --check   # fail on drift
 */

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const NAME = 'generate-capability-operations';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');

const argv = process.argv.slice(2);
const rootIdx = argv.indexOf('--root');
const root = rootIdx !== -1 ? path.resolve(process.cwd(), argv[rootIdx + 1]) : REPO_ROOT;
const CHECK = argv.includes('--check');

const MCP_PKG = path.join(root, 'src/packages/mcp-server');
const DOMAIN_OUT = path.join(
  root,
  'src/packages/core-domain/src/capabilities/capability-operations.generated.ts',
);
const CLI_OUT = path.join(
  root,
  'src/sdk/cli/src/commands/api/api.catalog.tool-schemas.generated.ts',
);

/**
 * A catalog this small can only mean the projection broke. Fifty tools are
 * registered today; anything under this floor is a generator failure wearing a
 * success exit code, and writing it would blank the published contract.
 */
const MINIMUM_OPERATIONS = 40;

function fail(lines) {
  console.error(`\n✗ ${NAME}: ${lines[0]}`);
  for (const l of lines.slice(1)) console.error(`  ${l}`);
  process.exit(1);
}

/**
 * Boot the real DI graph and ask the registry for its projection, then hand that
 * projection to the DOMAIN's `buildCapabilityManifest` so what comes back is the
 * manifest itself — not a second assembly of it.
 */
export function readManifest(pkgDir) {
  const entry = path.join(pkgDir, '__capability-operations.entry.ts');
  // The payload goes to a FILE, not to stdout. Fifty operations with full
  // input+output schemas is ~1.5 MB of JSON, and `process.exit()` does not wait
  // for a pipe to drain — the truncated tail looked exactly like a projection
  // failure and cost two debugging rounds here. Nest also logs to stdout during
  // bootstrap, so stdout was never a clean channel for it anyway.
  const payload = path.join(pkgDir, '__capability-operations.json');
  fs.writeFileSync(
    entry,
    [
      "import * as fs from 'node:fs';",
      "import { Test } from '@nestjs/testing';",
      "import { buildCapabilityManifest } from '@beyondnet/evolith-core-domain/capabilities/capabilities-manifest';",
      "import { AppModule } from './src/app.module';",
      "import { ToolRegistryService } from './src/mcp/tool-registry.service';",
      '',
      'async function main() {',
      '  const ref = await Test.createTestingModule({ imports: [AppModule] }).compile();',
      '  const registry = ref.get(ToolRegistryService, { strict: false });',
      '  const operations = registry.operationProjection();',
      '  const manifest = buildCapabilityManifest({ operations });',
      `  fs.writeFileSync(${JSON.stringify(payload)}, JSON.stringify({ manifest, registered: registry.list().length }));`,
      '  await ref.close();',
      '}',
      'main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });',
      '',
    ].join('\n'),
  );
  try {
    const res = spawnSync(
      'npx',
      ['ts-node', '--transpile-only', '-P', 'tsconfig.json', './__capability-operations.entry.ts'],
      { cwd: pkgDir, encoding: 'utf8', timeout: 300000, maxBuffer: 64 * 1024 * 1024 },
    );
    if (res.status !== 0 || !fs.existsSync(payload)) {
      fail([
        'could not read the operation projection from ToolRegistryService.',
        ...String(res.stderr || res.stdout || '')
          .trim()
          .split('\n')
          .slice(-10)
          .map((l) => `  ${l}`),
      ]);
    }
    try {
      return JSON.parse(fs.readFileSync(payload, 'utf8'));
    } catch (e) {
      fail(['the projection payload did not parse as JSON.', String(e).slice(0, 300)]);
    }
  } finally {
    fs.rmSync(entry, { force: true });
    fs.rmSync(payload, { force: true });
  }
}

const DOMAIN_BANNER = `// AUTO-GENERATED by .harness/scripts/generate-capability-operations.mjs from
// ToolRegistryService.operationProjection() — the live MCP tool registry
// describing itself. Do NOT edit by hand.
// Regenerate: node .harness/scripts/generate-capability-operations.mjs
// Drift guard: the same command with --check (wired into CI).
`;

function renderDomain(operations) {
  return (
    DOMAIN_BANNER +
    "\nimport type { CapabilityOperation } from './capability-operations';\n\n" +
    'export const CAPABILITY_OPERATIONS: readonly CapabilityOperation[] = ' +
    `${JSON.stringify(operations, null, 2)} as const;\n`
  );
}

const CLI_BANNER = `// AUTO-GENERATED by .harness/scripts/generate-capability-operations.mjs from the
// CAPABILITY MANIFEST (buildCapabilityManifest().operations), which is itself
// generated from ToolRegistryService.operationProjection(). Do NOT edit by hand.
//
// This file replaced a hand-written map of three entries that described fifty
// tools under the wrong names (GT-583).
// Regenerate: node .harness/scripts/generate-capability-operations.mjs
`;

function renderCli(manifest) {
  const schemas = Object.fromEntries(
    manifest.operations.map((op) => [
      op.name,
      { description: op.description, inputSchema: op.inputSchema, outputSchema: op.outputSchema },
    ]),
  );
  return (
    CLI_BANNER +
    "\nimport type { ToolSchema } from './api.catalog';\n\n" +
    '/** sha256 of the manifest operation catalog these schemas were generated from. */\n' +
    `export const GENERATED_TOOL_SCHEMAS_SHA256 = '${manifest.operationsSha256}';\n\n` +
    'export const GENERATED_TOOL_SCHEMAS: Record<string, ToolSchema> = ' +
    `${JSON.stringify(schemas, null, 2)};\n`
  );
}

function compare(file, next) {
  const before = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  return { changed: before !== next, before };
}

function main() {
  if (!fs.existsSync(path.join(MCP_PKG, 'tsconfig.json'))) {
    fail([`mcp-server package not found at ${MCP_PKG}`]);
  }

  const { manifest, registered } = readManifest(MCP_PKG);
  const operations = manifest.operations ?? [];

  // Anti-vacuous, in the two ways this can go wrong silently.
  if (operations.length < MINIMUM_OPERATIONS) {
    fail([
      `the projection returned ${operations.length} operation(s), below the floor of ${MINIMUM_OPERATIONS}.`,
      'Writing this would blank the published per-operation contract.',
    ]);
  }
  if (operations.length !== registered) {
    fail([
      `the projection dropped operations: ${registered} tools registered, ${operations.length} projected.`,
      'A projection that is a SUBSET of the registry is the GT-602 failure in MCP form.',
    ]);
  }

  const domainNext = renderDomain(operations);
  const cliNext = renderCli(manifest);
  const domainCmp = compare(DOMAIN_OUT, domainNext);
  const cliCmp = compare(CLI_OUT, cliNext);

  console.log(`${NAME} — operations derived from ToolRegistryService.operationProjection()`);
  console.log(`  operations ......... ${operations.length}`);
  console.log(`  operationsSha256 ... ${manifest.operationsSha256}`);
  console.log(`  manifest sha256 .... ${manifest.sha256}`);

  if (CHECK) {
    const drifted = [
      ...(domainCmp.changed ? [path.relative(root, DOMAIN_OUT)] : []),
      ...(cliCmp.changed ? [path.relative(root, CLI_OUT)] : []),
    ];
    if (drifted.length > 0) {
      fail([
        'the generated capability artifacts have DRIFTED from the runtime projection.',
        ...drifted.map((f) => `  drifted: ${f}`),
        '',
        '  regenerate with: node .harness/scripts/generate-capability-operations.mjs',
        '',
        '  An operation the registry serves and the manifest omits is an operation',
        '  no consumer can discover a schema for — the hand-maintained shape that',
        '  shipped a three-entry CLI catalog for a fifty-tool surface.',
      ]);
    }
    console.log(`\n✓ ${NAME}: the generated artifacts match the runtime (${operations.length} operations).`);
    return;
  }

  fs.writeFileSync(DOMAIN_OUT, domainNext);
  fs.writeFileSync(CLI_OUT, cliNext);
  console.log(`\n✓ ${NAME}: wrote ${path.relative(root, DOMAIN_OUT)}`);
  console.log(`✓ ${NAME}: wrote ${path.relative(root, CLI_OUT)}`);
}

const invokedDirectly =
  process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (invokedDirectly) main();
