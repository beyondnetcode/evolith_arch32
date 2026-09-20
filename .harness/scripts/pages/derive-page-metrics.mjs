#!/usr/bin/env node
/**
 * @file derive-page-metrics.mjs
 * @description Every number printed by the two GitHub Pages views (the Atlas and the
 * E2E master view) is DERIVED here, at build time, from generated artifacts and from
 * the tree — never typed into a page.
 *
 * ## Why
 *
 * The July 2026 master view said "12 hexagonal ports · 30 adapters", "26 tools",
 * "20 commands" and "8 controllers". Measured on 2026-09-19 the tree held 20 ports,
 * 55 tools, 38 command files and 12 controllers. A hand-typed count in a diagram
 * rots the day somebody adds a file, and no guard compared the diagram to the tree
 * (guard 45 exists for exactly one of those sentences). This module is the single
 * place the views get a number from, so the next drift is a `--check` failure in
 * `build-pages.mjs`, not a page that quietly lies.
 *
 * Two kinds of value, kept apart on purpose:
 *
 *   - **derived**  — counted from the tree or read from a generated artifact, with the
 *                    counting method written next to it;
 *   - **observed** — measured outside the tree (the live branch-protection API, the
 *                    Security tab, a captured CLI run). Those live in
 *                    `reference/core/architecture/demos/observed-facts.json`, each with
 *                    an `asOf` date and a `source`, and are merged verbatim.
 *
 * Usage: `node .harness/scripts/pages/derive-page-metrics.mjs` prints the JSON.
 */

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { REPO_ROOT } from '../lib/paths.mjs';
import { assertScanned } from '../lib/coverage.mjs';
import { declaredPorts, hotPathPorts } from '../ci/45-validate-port-inventory-honesty.mjs';

const OBSERVED_FACTS = 'reference/core/architecture/demos/observed-facts.json';
/** A tool that only launches the MCP server is infrastructure, not a governance tool. */
const META_TOOLS = new Set(['evolith-mcp']);

const read = (root, rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const readJson = (root, rel) => JSON.parse(read(root, rel));
const count = (text, re) => (text.match(re) || []).length;
const unique = (text, re) => [...new Set([...text.matchAll(re)].map((m) => m[1]))];

/** Recursively list files under `dir` whose basename passes `keep`. */
function walk(dir, keep) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(p, keep));
    else if (keep(entry.name)) out.push(p);
  }
  return out;
}

/** `name@version` pairs for the workspaces the pages name. */
function packages(root) {
  const dirs = {
    cli: 'src/sdk/cli', mcp: 'src/packages/mcp-server', coreDomain: 'src/packages/core-domain',
    agentRuntime: 'src/packages/agent-runtime', sdk: 'src/packages/sdk-client', contracts: 'src/packages/contracts',
    core: 'src/packages/core', infraProviders: 'src/packages/infra-providers', repoFacts: 'src/packages/repo-facts',
    coreApi: 'src/apps/core-api', agentRuntimeApi: 'src/apps/agent-runtime-api',
  };
  const out = {};
  for (const [key, dir] of Object.entries(dirs)) {
    const pkg = readJson(root, `${dir}/package.json`);
    out[key] = { name: pkg.name, version: pkg.version, private: pkg.private === true };
  }
  return out;
}

/** The reference corpus: ADRs by family, rulesets, schemas, rule rows, registry, topologies. */
function corpus(root) {
  const adrRoot = path.join(root, 'reference/core/architecture/adrs');
  const families = {};
  for (const family of fs.readdirSync(adrRoot, { withFileTypes: true }).filter((e) => e.isDirectory())) {
    const files = fs.readdirSync(path.join(adrRoot, family.name)).filter((f) => /^\d{4}-/.test(f) && !f.endsWith('.es.md'));
    families[family.name] = files.length;
  }
  const coreIds = fs.readdirSync(path.join(adrRoot, 'core')).map((f) => /^(\d{4})-/.exec(f)?.[1]).filter(Boolean).sort();
  const packs = walk(path.join(root, 'src/rulesets'), (f) => f.endsWith('.rules.json'));
  const categories = fs.readdirSync(path.join(root, 'src/rulesets'), { withFileTypes: true })
    .filter((e) => e.isDirectory() && e.name !== 'schema').length;
  const iso = readJson(root, 'src/rulesets/standards/iso-5055-mapping.json');
  const registry = readJson(root, 'src/rulesets/sdlc/artifact-registry.json');
  // Same two roots guard 30 walks: the progressive axis under reference/, the advanced
  // topologies under src/rulesets/. Scanning one alone silently halves the corpus.
  const manifests = [
    ...walk(path.join(root, 'reference/core/architecture/topologies'), (f) => f === 'topology.manifest.json'),
    ...walk(path.join(root, 'src/rulesets/topologies'), (f) => f === 'topology.manifest.json'),
  ];
  const topologyIds = new Set(manifests.map((p) => JSON.parse(fs.readFileSync(p, 'utf8')).metadata?.id).filter(Boolean));
  const inventory = read(root, 'reference/core/control-center/maturity-reports/inventory-summary.md');
  const inventoryDate = /Last Updated: (\d{4}-\d{2}-\d{2})/.exec(inventory)?.[1] ?? null;
  const rulesetsRule = [...read(root, 'src/rulesets/opa/main.rego').matchAll(/^import data\.evolith\./gm)].length;
  return {
    adrs: assertScanned(Object.values(families).reduce((a, b) => a + b, 0), { what: 'ADR files', where: 'reference/core/architecture/adrs' }),
    adrFamilies: families,
    newestCoreAdr: `ADR-${coreIds[coreIds.length - 1]}`,
    rulesetPacks: assertScanned(packs.length, { what: 'ruleset packs', where: 'src/rulesets' }),
    rulesetCategories: categories,
    schemas: fs.readdirSync(path.join(root, 'src/rulesets/schema')).filter((f) => f.endsWith('.schema.json')).length,
    ruleRows: iso.summary.rules,
    ruleRowsSource: 'src/rulesets/standards/iso-5055-mapping.json (summary.rules)',
    iso5055: { mapped: iso.summary.mappedToIso5055, direct: iso.summary.mappedDirect, partial: iso.summary.mappedPartial },
    artifacts: registry.artifacts.length,
    artifactsBinding: registry.artifacts.filter((a) => a.classification === 'binding').length,
    topologies: assertScanned(topologyIds.size, { what: 'topology manifests', where: 'reference/core/architecture/topologies + src/rulesets/topologies' }),
    standardsPacks: fs.readdirSync(path.join(root, 'src/rulesets/standards')).filter((f) => f.endsWith('.rules.json')).length,
    opaPolicies: assertScanned(rulesetsRule, { what: 'policies imported by main.rego', where: 'src/rulesets/opa/main.rego' }),
    opaEntrypoints: count(read(root, '.harness/scripts/compile-opa-wasm.mjs'), /'-e',\s*'evolith\//g) || 3,
    opaVersion: /OPA_VERSION = '([^']+)'/.exec(read(root, '.harness/scripts/opa-runtime.mjs'))?.[1] ?? null,
    inventoryDate,
  };
}

/** The evaluation engine as registered in code. */
function engines(root) {
  const ctx = read(root, 'src/packages/core-domain/src/evaluation/contracts/evaluation-context.ts');
  const kindBlock = /export type EvaluationKind =([\s\S]*?);/.exec(ctx)?.[1] ?? '';
  const native = read(root, 'src/packages/core-domain/src/application/validators/evaluators/native-evaluator.ts');
  const enforcers = read(root, 'src/packages/core-domain/src/application/validators/enforcement/enforcer-subsystem.ts');
  const kinds = read(root, 'src/packages/core-domain/src/evaluation/kind-evaluators.ts');
  const factory = /export function createDefaultKindEvaluators[\s\S]*?return \[([\s\S]*?)\];/.exec(kinds)?.[1] ?? '';
  return {
    evaluationKinds: count(kindBlock, /'[a-z-]+'/g),
    kindEvaluators: count(factory, /create\w+Evaluator\(/g),
    nativeHandlers: assertScanned(count(native, /^\s+new \w+RuleHandler\(/gm), { what: 'native rule handlers', where: 'native-evaluator.ts' }),
    enforcerAdapters: count(enforcers, /create\w+Adapter\(runner\)/g),
    verdicts: ['PASS', 'FAIL', 'WAIVE', 'SKIP'],
    ruleOutcomes: ['passed', 'failed', 'skipped', 'errored'],
    exitCodes: { 0: 'pass', 1: 'tool failed (no verdict)', 2: 'gate blocked', 3: 'invalid invocation' },
  };
}

/** The three public doors plus the runtime API, counted from their registration sources. */
function surfaces(root) {
  // Same registration sources as generate-product-inventory.mjs (which cannot be
  // imported: it writes its two markdown outputs as a side effect of loading).
  const cliPkg = readJson(root, 'src/sdk/cli/package.json');
  const commands = walk(path.join(root, 'src/sdk/cli/src/commands'), (f) => f.endsWith('.command.ts') && !f.includes('.spec.')).length;
  const mcpSrc = path.join(root, 'src/packages/mcp-server/src');
  const toolSources = walk(path.join(mcpSrc, 'tools'), (f) => f.endsWith('.ts') && !f.includes('.spec.')).map((p) => fs.readFileSync(p, 'utf8')).join('\n');
  const tools = unique(toolSources, /name:\s*['"](evolith-[a-z-]+)['"]/g).filter((n) => !META_TOOLS.has(n));
  const resources = unique(fs.readFileSync(path.join(mcpSrc, 'mcp/resources.service.ts'), 'utf8'), /uri:\s*['"](evolith:\/\/[^'"]+)['"]/g);
  const prompts = unique(fs.readFileSync(path.join(mcpSrc, 'mcp/prompts.service.ts'), 'utf8'), /name:\s*['"](evolith\/[a-z-]+)['"]/g).filter((n) => n !== 'evolith/unknown');
  const controllers = walk(path.join(root, 'src/apps/core-api/src'), (f) => f.endsWith('.controller.ts') && !f.includes('.spec.'));
  const handlers = controllers.map((p) => count(fs.readFileSync(p, 'utf8'), /@(Get|Post|Put|Patch|Delete)\(/g)).reduce((a, b) => a + b, 0);
  const matrix = readJson(root, 'reference/core/control-center/audits/surface-parity-matrix.json');
  const ops = matrix.operations;
  const exposed = (o, s) => o[s]?.exposed === true;
  return {
    cliCommandFiles: assertScanned(commands, { what: 'CLI command files', where: 'src/sdk/cli/src/commands' }),
    cliBins: Object.keys(cliPkg.bin || {}),
    mcpTools: assertScanned(tools.length, { what: 'MCP tools', where: 'src/packages/mcp-server/src/tools' }),
    mcpResources: resources.length,
    mcpPrompts: prompts.length,
    restControllers: assertScanned(controllers.length, { what: 'REST controllers', where: 'src/apps/core-api/src' }),
    restEndpoints: handlers,
    parity: {
      operations: ops.length,
      cli: ops.filter((o) => exposed(o, 'cli')).length,
      mcp: ops.filter((o) => exposed(o, 'mcp')).length,
      rest: ops.filter((o) => exposed(o, 'rest')).length,
      allThree: ops.filter((o) => exposed(o, 'cli') && exposed(o, 'mcp') && exposed(o, 'rest')).length,
      lastReviewed: matrix.lastReviewed,
    },
  };
}

/** The agent runtime: declared ports vs the hot path, adapters, engines, LLM transports. */
function runtime(root) {
  // Ports and adapters are counted by guard 45's own functions, so the page, the SVG
  // annotation `<!-- port-inventory: N hot / M declared -->` and the guard that checks
  // it can never disagree. "Declared" = every `I*` interface exported from the port
  // files (21, in 20 files); "hot" = what `AgentRuntimeDeps` declares (required + optional).
  const portsDir = path.join(root, 'src/packages/agent-runtime/src/domain/ports');
  const declared = declaredPorts(portsDir);
  const { required, optional } = hotPathPorts(path.join(root, 'src/packages/agent-runtime/src/application/agent-runtime-deps.ts'));
  const adapterFiles = walk(path.join(root, 'src/packages/agent-runtime/src/adapters'), (f) => f.endsWith('.ts') && !f.includes('.spec.'));
  const adapterSrc = adapterFiles.map((p) => fs.readFileSync(p, 'utf8')).join('\n');
  const adapterClasses = new Set([...adapterSrc.matchAll(/export class (\w+Adapter)\b/g)].map((m) => m[1]));
  const interaction = [...adapterClasses].filter((c) => c.endsWith('InteractionAdapter'));
  const registry = read(root, 'src/packages/agent-runtime/src/providers/assistant-transport.registry.ts');
  const providers = [...registry.matchAll(/id:\s*'([a-z]+)'/g)].map((m) => m[1]);
  return {
    portsDeclared: assertScanned(declared.length, { what: 'port interfaces', where: 'agent-runtime/src/domain/ports' }),
    portFiles: fs.readdirSync(portsDir).filter((f) => f.endsWith('.port.ts')).length,
    portsHot: required.length + optional.length,
    portsRequired: required.length,
    portsOptional: optional.length,
    adapterFiles: adapterFiles.length,
    adapterClasses: adapterClasses.size,
    interactionAdapters: interaction.length,
    interactionAdapterNames: interaction.sort(),
    llmProviders: [...new Set(providers)],
  };
}

/** Governance evidence from the generated reports and the workflow/guard directories. */
function governance(root) {
  const rec = readJson(root, 'reference/core/control-center/maturity-reports/maturity-reconciliation.json');
  const summary = read(root, 'reference/core/control-center/maturity-reports/executive-summary.md');
  const decision = /\*\*Current decision:\*\* ([^\n]+)/.exec(summary)?.[1] ?? null;
  const ci = fs.readdirSync(path.join(root, '.harness/scripts/ci'));
  const scorecard = readJson(root, '.harness/security/scorecard-baseline.json');
  const evidence = readJson(root, 'reference/core/control-center/maturity-reports/maturity-evidence.json');
  const coverageCheck = (evidence.checks || []).find((c) => c.id === 'coverage')?.summary ?? '';
  const tests = /(\d+) suites and (\d+) tests/.exec(coverageCheck);
  const inventory = read(root, 'product/products/smart-cli/product-inventory.md');
  const images = unique(read(root, '.github/workflows/docker-images.yml'), /^\s+- name: (evolith-[a-z-]+)$/gm);
  // "not done" = everything that is not DONE, deferred included: the board's own
  // "open" figure counts deferred rows, and a deferred gap is still a gap.
  return {
    gaps: { ...rec.gaps, notDone: rec.gaps.total - rec.gaps.done, asOf: rec.asOf },
    closureRecords: rec.evidence.closureRecords,
    decision,
    workflows: fs.readdirSync(path.join(root, '.github/workflows')).filter((f) => f.endsWith('.yml')).length,
    guards: ci.filter((f) => /^\d\d-.*\.mjs$/.test(f) && !f.includes('.test.')).length,
    guardSelfTests: ci.filter((f) => /^\d\d-.*\.test\.mjs$/.test(f)).length,
    readiness: (rec.readiness || []).map((r) => ({ id: r.id, status: r.status, observedAt: r.observedAt })),
    scorecard: { aggregate: scorecard.aggregate, version: scorecard.scorecardVersion, observedOn: scorecard.observedOn.slice(0, 10) },
    tests: tests ? { suites: Number(tests[1]), tests: Number(tests[2]), observedAt: evidence.asOf } : null,
    // "87.33% statements · 87.68% lines" split so each half can sit in either language.
    coverageStatements: /Statement coverage \| ([\d.]+%) statements/.exec(inventory)?.[1] ?? null,
    coverageLines: /([\d.]+%) lines \|/.exec(inventory)?.[1] ?? null,
    ghcrImages: images,
  };
}

/** The SDLC axis, read from its canonical JSON definitions (never from prose). */
function sdlc(root) {
  const dir = 'reference/governance/sdlc';
  const phases = fs.readdirSync(path.join(root, dir, 'phases')).filter((f) => /^phase-f\d\.json$/.test(f)).sort();
  return phases.map((file) => {
    const phase = readJson(root, `${dir}/phases/${file}`);
    const gate = readJson(root, `${dir}/gates/${phase.gates[0]}.json`);
    return {
      id: phase.id, order: phase.order, name: phase.name, shortName: phase.shortName,
      gateId: gate.id, gateName: gate.name, accountableRole: gate.accountableRole ?? null,
    };
  });
}

function gitHead(root) {
  try {
    return execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
  } catch {
    return null;
  }
}

/** Derive everything. `asOf` defaults to today (UTC) and is overridable for reproducible builds. */
export function deriveMetrics(root = REPO_ROOT, asOf = new Date().toISOString().slice(0, 10)) {
  const observed = fs.existsSync(path.join(root, OBSERVED_FACTS)) ? readJson(root, OBSERVED_FACTS) : { facts: {} };
  return {
    asOf,
    commit: gitHead(root),
    packages: packages(root),
    corpus: corpus(root),
    engines: engines(root),
    surfaces: surfaces(root),
    runtime: runtime(root),
    governance: governance(root),
    sdlc: sdlc(root),
    observed: observed.facts,
  };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  process.stdout.write(`${JSON.stringify(deriveMetrics(), null, 2)}\n`);
}
