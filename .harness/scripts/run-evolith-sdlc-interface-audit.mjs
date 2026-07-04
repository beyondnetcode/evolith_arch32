#!/usr/bin/env node

/**
 * run-evolith-sdlc-interface-audit — Winston SDLC ↔ Interface governance audit.
 *
 * Automates the analysis of whether every SDLC phase, gate and artifact has a
 * formal, complete and governable interaction with the Core interfaces (CLI,
 * MCP, REST, events, contracts), so that Evolith Tracker, humans, AI agents,
 * pipelines and external systems can operate the SDLC.
 *
 * ARCHITECTURAL PREMISE (by design):
 *   Evolith Core is TENANT-AGNOSTIC. It exposes catalogs, evaluation, validation,
 *   contracts and events, and is PARAMETRIZABLE by an external orchestrator
 *   (Evolith Tracker). Tenant-specific flow composition ("which phases/gates a
 *   tenant uses, how it executes") lives in Tracker, NOT in Core. Therefore this
 *   audit checks that Core is COMPOSABLE/parametrizable for Tracker — not that
 *   Core stores per-tenant configuration.
 *
 * Each dimension runs deterministic probes against the repository (path
 * existence + content regex) and reports PASS / PARTIAL / INCOMPLETE plus the
 * concrete gaps, risk and recommendation.
 *
 * Usage:
 *   node .harness/scripts/run-evolith-sdlc-interface-audit.mjs              # Full audit (EN)
 *   node .harness/scripts/run-evolith-sdlc-interface-audit.mjs --es         # Auditoría completa (ES)
 *   node .harness/scripts/run-evolith-sdlc-interface-audit.mjs --report     # JSON report (machine-readable)
 *   node .harness/scripts/run-evolith-sdlc-interface-audit.mjs --gap-format # gap-tracking table + catalog
 *   node .harness/scripts/run-evolith-sdlc-interface-audit.mjs --dim D5     # Run a single dimension
 *   node .harness/scripts/run-evolith-sdlc-interface-audit.mjs --strict     # Exit 1 on ANY gap (default: P0 only)
 *
 * Exit codes:
 *   0 - no P0 gaps (or, with --strict, no gaps at all)
 *   1 - one or more blocking gaps
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../');

const I18N = {
  en: {
    title: 'WINSTON — SDLC ↔ INTERFACE GOVERNANCE AUDIT',
    premise: 'Premise: Core is tenant-agnostic; per-tenant flow composition belongs to Evolith Tracker.',
    overall: 'Overall governance coverage',
    dimensions: 'DIMENSION DETAILS',
    gaps: 'GAPS DETECTED',
    none: 'No gaps detected. The SDLC is fully interfaced and governable.',
    risk: 'Risk', fix: 'Recommendation', owner: 'Owner',
    end: 'END OF AUDIT REPORT',
  },
  es: {
    title: 'WINSTON — AUDITORÍA DE GOBERNANZA SDLC ↔ INTERFACES',
    premise: 'Premisa: el Core es agnóstico a tenants; la composición de flujo por tenant es responsabilidad de Evolith Tracker.',
    overall: 'Cobertura de gobernanza global',
    dimensions: 'DETALLE POR DIMENSIÓN',
    gaps: 'GAPS DETECTADOS',
    none: 'Sin gaps. El SDLC está completamente interfaceado y es gobernable.',
    risk: 'Riesgo', fix: 'Recomendación', owner: 'Responsable',
    end: 'FIN DEL INFORME',
  },
};

// "owner" indicates where the responsibility lives once gaps are closed.
const CORE = 'Core';
const TRACKER = 'Tracker';

/**
 * Dimensions and their probes.
 * check.type:
 *   'path'  -> found = path exists
 *   'grep'  -> found = regex matches content under target (file or dir)
 * check.want (default true): satisfied = (found === want).
 *   want:false expresses "this MUST be absent" (e.g. duplicate/orphan models).
 * check.severity: P0 | P1 | P2 | INFO
 */
const DIMENSIONS = [
  {
    id: 'D1', name: 'SDLC model defined & engine-backed', owner: CORE,
    checks: [
      { name: 'Phase definitions exist', type: 'path', target: 'reference/core/sdlc/phases', severity: 'P0', risk: 'No canonical phases to govern', fix: 'Keep phase-f*.json as the single source' },
      { name: 'Gate definitions exist', type: 'path', target: 'reference/core/sdlc/gates', severity: 'P0', risk: 'No gate contracts', fix: 'Maintain gate-f*.json' },
      { name: 'Gate JSON schema exists', type: 'path', target: 'reference/core/sdlc/sdlc-gate.schema.json', severity: 'P1', risk: 'Gates unvalidated structurally', fix: 'Keep sdlc-gate.schema.json' },
      { name: 'Executable gate engine rules exist', type: 'path', target: 'src/rulesets/phase-gates/phase-gates.rules.json', severity: 'P0', risk: 'Gates are not executable', fix: 'Keep phase-gates.rules.json wired to the validator' },
      { name: 'Single gate source (no divergent gate rules in two places)', type: 'grep', target: 'reference/core/sdlc/gates', pattern: '"rules"\\s*:', want: false, severity: 'P1', risk: 'Two divergent gate sources; cited .rego not executed', fix: 'Unify gates/*.json with phase-gates.rules.json; ensure cited .rego run' },
    ],
  },
  {
    id: 'D2', name: 'Interfaces exposed (CLI / MCP / REST) + governed parity', owner: CORE,
    checks: [
      { name: 'Surface parity matrix exists', type: 'path', target: 'reference/core/control-center/surface-parity-matrix.json', severity: 'P0', risk: 'No governed map of operations per interface', fix: 'Keep matrix + CI gate 24' },
      { name: 'REST controllers exist', type: 'path', target: 'apps/core-api/src/presentation/controllers', severity: 'P0', risk: 'No REST surface for Tracker/external', fix: 'Maintain core-api controllers' },
      { name: 'OpenAPI / Swagger spec exists', type: 'path', target: 'apps/core-api/src/openapi', severity: 'P1', risk: 'No machine contract for REST', fix: 'Keep OpenAPI config' },
      { name: 'MCP tools exist', type: 'path', target: 'packages/mcp-server/src/tools', severity: 'P0', risk: 'No agent surface', fix: 'Maintain MCP tools' },
      { name: 'CLI commands exist', type: 'path', target: 'sdk/cli/src/commands', severity: 'P0', risk: 'No human/pipeline surface', fix: 'Maintain CLI commands' },
    ],
  },
  {
    id: 'D3', name: 'Artifact contracts & validation (existence vs semantic)', owner: CORE,
    checks: [
      { name: 'Artifact templates catalog exists', type: 'path', target: 'reference/core/sdlc/04-artifact-templates', severity: 'P1', risk: 'No artifact catalog', fix: 'Keep templates' },
      { name: 'Artifact JSON schemas exist', type: 'path', target: 'src/rulesets/schema', severity: 'P0', risk: 'Artifacts cannot be validated structurally', fix: 'Add schema per artifact' },
      { name: 'Evidence validator exists', type: 'path', target: 'packages/core-domain/src/application/validators/evidence-validator.ts', severity: 'P0', risk: 'No artifact validation', fix: 'Keep evidence validator' },
      { name: 'Semantic blocking-criteria validator exists', type: 'path', target: 'packages/core-domain/src/application/validators/blocking-criteria-validator.ts', severity: 'P1', risk: 'Gates only check existence', fix: 'Keep/extend semantic checks' },
      { name: 'Validates real artifact, not the Core template', type: 'grep', target: 'packages/core-domain/src/application/validators/evidence-validator.ts', pattern: 'template', want: false, severity: 'P0', risk: 'AJV inert: validates template path, not the satellite artifact', fix: 'Resolve satellite artifact and run AJV/semantic validation' },
    ],
  },
  {
    id: 'D4', name: 'Unified verdict & artifact state model', owner: CORE,
    checks: [
      { name: 'Canonical verdict model exists (gate-evidence)', type: 'grep', target: 'packages/core-domain/src/domain/gate-evidence.ts', pattern: 'GATE_VERDICTS', severity: 'P0', risk: 'No canonical verdict', fix: 'Keep gate-evidence as canonical' },
      { name: 'No orphan/divergent verdict model (gate-decision)', type: 'grep', target: 'packages/core-domain/src/gates/decision/gate-decision.ts', pattern: "'PASS'|PASS\\b", want: false, severity: 'P1', risk: 'Fragmented verdicts (PASS/FAIL/WAIVED) — dead code', fix: 'Integrate or remove gate-decision; one verdict vocabulary' },
      { name: 'Artifact state machine exists (created→…→archived)', type: 'grep', target: 'packages/core-domain/src', pattern: "pending-validation|'archived'|\\bobserved\\b", exts: ['.ts'], severity: 'P0', risk: 'No lifecycle state for artifacts/phases', fix: 'Implement artifact/phase state machine' },
    ],
  },
  {
    id: 'D5', name: 'Domain events / async governance', owner: CORE,
    checks: [
      { name: 'Event bus / emitter infrastructure declared', type: 'grep', target: 'PKG_JSONS', pattern: 'event-emitter|kafkajs|amqplib|nats|@nestjs/cqrs', severity: 'P0', risk: 'No async governance; Tracker forced to poll', fix: 'Add domain event bus + outbox' },
      { name: 'Named domain events emitted (phase/gate/artifact)', type: 'grep', target: 'EVENT_SRC', pattern: "phase\\.started|phase\\.completed|gate\\.approved|gate\\.rejected|artifact\\.created|artifact\\.validated", severity: 'P0', risk: 'No event catalog for Tracker/pipelines/audit', fix: 'Define + emit versioned domain events' },
      { name: 'Webhook notifier port exists (interim async)', type: 'path', target: 'packages/core-domain/src/application/ports/webhook-notifier.port.ts', severity: 'INFO', risk: 'Only one-shot webhook exists', fix: 'Evolve one-shot webhook into subscription + retries + HMAC' },
    ],
  },
  {
    id: 'D6', name: 'Authorization (ABAC / OPA / role enforcement)', owner: CORE,
    checks: [
      { name: 'ABAC evaluator (native) exists', type: 'path', target: 'packages/mcp-server/src/mcp/abac-evaluator.ts', severity: 'P0', risk: 'No attribute-based access control', fix: 'Keep ABAC evaluator' },
      { name: 'ABAC OPA policy exists (TS/OPA parity)', type: 'path', target: 'src/rulesets/opa/abac-mcp-tool-access.rego', severity: 'P1', risk: 'No policy-as-code for access', fix: 'Keep OPA parity' },
      { name: 'Formal role model (enum/hierarchy)', type: 'grep', target: 'packages', pattern: 'enum\\s+Role|ROLE_HIERARCHY|RoleEnum', exts: ['.ts'], severity: 'P1', risk: 'Roles are free strings; no governance of who approves', fix: 'Introduce formal role model' },
      { name: 'Gate approver role is enforced (not only declarative)', type: 'grep', target: 'packages', pattern: 'assertApprover|approverHasRole|enforceAccountable|authorizeApprover|assertAccountableRole', exts: ['.ts'], severity: 'P1', risk: 'accountableRole/waiverAuthority declarative only; anyone can approve', fix: 'OPA check: approver/waiver actor holds the required role' },
    ],
  },
  {
    id: 'D7', name: 'Composability for Tracker (tenant-agnostic, parametrizable)', owner: TRACKER,
    note: 'Core must be parametrizable by Tracker; it must NOT store per-tenant config (that is by design Tracker\'s job).',
    checks: [
      { name: 'Tenant CONTEXT passthrough for audit/ABAC exists', type: 'grep', target: 'packages/mcp-server/src/mcp/audit-logger.ts', pattern: 'tenant', severity: 'P1', risk: 'Core cannot attribute actions to a tenant', fix: 'Keep tenant context in audit/ABAC inputs (not config)' },
      { name: 'Workflow-definition seam exists (getWorkflow)', type: 'grep', target: 'packages/core-domain/src', pattern: 'getWorkflow|WorkflowDefinition|IWorkflowDefinitionProvider', exts: ['.ts'], severity: 'P0', risk: 'No seam for Tracker to supply a composed flow', fix: 'Expose an interface to accept + validate an externally-supplied WorkflowDefinition' },
      { name: 'Op to VALIDATE an externally-supplied workflow against Core invariants', type: 'grep', target: 'packages/core-domain/src', pattern: 'validateWorkflow|workflow.*invariant|WorkflowValidator', exts: ['.ts'], severity: 'P0', risk: 'Tracker could compose flows that break governance', fix: 'Add validateWorkflow(definition): checks mandatory gates, OPA, non-omittable artifacts' },
      { name: 'Composable catalogs exist (topologies/agents)', type: 'path', target: 'reference/architecture/topologies', severity: 'P1', risk: 'Nothing for Tracker to compose from', fix: 'Expose phase/gate/artifact catalogs (not only topologies)' },
    ],
  },
  {
    id: 'D8', name: 'Extensibility without modifying the core', owner: CORE,
    checks: [
      { name: 'CLI plugin loader exists', type: 'grep', target: 'sdk/cli/src', pattern: 'plugin-loader|PluginLoader|loadPlugins', exts: ['.ts'], severity: 'P1', risk: 'No extension point for commands', fix: 'Keep plugin loader' },
      { name: 'Validator handler registry is open (no hardcoded switch)', type: 'grep', target: 'packages/core-domain/src/application/validators', pattern: 'INativeRuleHandler|canHandle', exts: ['.ts'], severity: 'P2', risk: 'Adding validators requires core edits', fix: 'Make handler registry plugin-based' },
    ],
  },
  {
    id: 'D9', name: 'Blueprints as first-class governed entity', owner: CORE,
    checks: [
      { name: 'Blueprint entity exists (not only an evidence file)', type: 'grep', target: 'packages/core-domain/src', pattern: 'class\\s+Blueprint|interface\\s+Blueprint\\b|BlueprintModel', exts: ['.ts'], severity: 'P1', risk: 'Blueprint is a concept; not validated vs OPA/topologies/policies', fix: 'Model Blueprint + validate against rulesets/topologies/tenant policy' },
    ],
  },
  {
    id: 'D10', name: 'Auditability & traceability', owner: CORE,
    checks: [
      { name: 'Audit logger exists', type: 'path', target: 'packages/mcp-server/src/mcp/audit-logger.ts', severity: 'P0', risk: 'No audit trail', fix: 'Keep audit logger' },
      { name: 'Append-only command history exists', type: 'grep', target: 'sdk/cli/src', pattern: 'history\\.jsonl|CommandHistory', exts: ['.ts'], severity: 'P1', risk: 'No human-action trace', fix: 'Keep command history' },
      { name: 'Persistent audit ledger (not only in-memory/JSONL)', type: 'grep', target: 'packages', pattern: 'AuditRepository|IAuditStore|persistAudit|appendToLedger', exts: ['.ts'], severity: 'P1', risk: 'Audit not durable/queryable', fix: 'Persist audit to an append-only store' },
    ],
  },
  {
    id: 'D11', name: 'Contracts & SDK for integrators', owner: CORE,
    checks: [
      { name: 'Schemas available as contracts', type: 'path', target: 'src/rulesets/schema', severity: 'P1', risk: 'No data contracts', fix: 'Keep schemas' },
      { name: 'Typed SDK client for agents/integrators', type: 'grep', target: 'PKG_NAMES', pattern: '@evolith/sdk', severity: 'P1', risk: 'Integrators reimplement clients; untyped', fix: 'Publish @evolith/sdk (typed REST+MCP from OpenAPI/schemas)' },
    ],
  },
];

// ---------------------------------------------------------------------------
// Probes
// ---------------------------------------------------------------------------

async function exists(rel) {
  try { await fs.access(path.join(rootDir, rel)); return true; } catch { return false; }
}

async function readSafe(abs) {
  try { return await fs.readFile(abs, 'utf8'); } catch { return null; }
}

async function walk(absDir, exts) {
  const out = [];
  let entries;
  try { entries = await fs.readdir(absDir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    if (e.name === 'node_modules' || e.name === 'dist' || e.name === '.git') continue;
    const full = path.join(absDir, e.name);
    if (e.isDirectory()) out.push(...await walk(full, exts));
    else if (!exts || exts.some((x) => e.name.endsWith(x))) out.push(full);
  }
  return out;
}

async function grepTarget(target, pattern, exts) {
  const re = new RegExp(pattern);

  // Special virtual targets
  if (target === 'PKG_JSONS' || target === 'PKG_NAMES') {
    const pkgs = (await walk(rootDir, ['package.json'])).filter((p) => !p.includes('node_modules'));
    for (const p of pkgs) {
      const c = await readSafe(p);
      if (c && re.test(c)) return true;
    }
    return false;
  }
  if (target === 'EVENT_SRC') {
    // search app/domain source but exclude code generators (scaffolders emit sample events)
    const dirs = ['packages/core-domain/src', 'apps/core-api/src', 'packages/mcp-server/src'];
    for (const d of dirs) {
      const files = (await walk(path.join(rootDir, d), ['.ts'])).filter((f) => !/generators|scaffold|\.(spec|test)\.ts$/.test(f));
      for (const f of files) { const c = await readSafe(f); if (c && re.test(c)) return true; }
    }
    return false;
  }

  const abs = path.join(rootDir, target);
  let stat;
  try { stat = await fs.stat(abs); } catch { return false; }
  if (stat.isDirectory()) {
    // Exclude test files: capability must be evidenced by production code, not test data.
    const files = (await walk(abs, exts || ['.ts', '.json'])).filter((f) => !/\.(spec|test)\.ts$/.test(f));
    for (const f of files) { const c = await readSafe(f); if (c && re.test(c)) return true; }
    return false;
  }
  const c = await readSafe(abs);
  return c ? re.test(c) : false;
}

async function runCheck(check) {
  const want = check.want !== false;
  let found;
  if (check.type === 'path') found = await exists(check.target);
  else found = await grepTarget(check.target, check.pattern, check.exts);
  const satisfied = found === want;
  return { ...check, found, satisfied, status: satisfied ? 'PASS' : 'GAP' };
}

async function evaluateDimension(dim) {
  const results = [];
  for (const c of dim.checks) results.push(await runCheck(c));
  const passed = results.filter((r) => r.satisfied).length;
  const total = results.length;
  const pct = Math.round((passed / total) * 100);
  return {
    id: dim.id, name: dim.name, owner: dim.owner, note: dim.note || null,
    results, passed, total, percentage: pct,
    status: pct === 100 ? 'COMPLETE' : pct >= 50 ? 'PARTIAL' : 'INCOMPLETE',
  };
}

async function generateReport() {
  const report = { timestamp: new Date().toISOString(), dimensions: [], summary: {} };
  let total = 0, passed = 0;
  for (const d of DIMENSIONS) {
    const r = await evaluateDimension(d);
    report.dimensions.push(r);
    total += r.total; passed += r.passed;
  }
  const pct = Math.round((passed / total) * 100);
  const gaps = report.dimensions.flatMap((d) => d.results.filter((r) => !r.satisfied).map((r) => ({ dim: d.id, owner: d.owner, ...r })));
  report.summary = {
    totalChecks: total, passedChecks: passed, overallPercentage: pct,
    p0Gaps: gaps.filter((g) => g.severity === 'P0').length,
    totalGaps: gaps.length,
    verdict: pct === 100 ? 'FULLY_GOVERNABLE' : pct >= 75 ? 'MOSTLY_GOVERNABLE' : pct >= 50 ? 'PARTIALLY_GOVERNABLE' : 'MINIMAL',
  };
  report.gaps = gaps;
  return report;
}

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------

function icon(status) { return status === 'COMPLETE' ? '✅' : status === 'PARTIAL' ? '⚠️ ' : '❌'; }

function printReport(report, t) {
  console.log('\n========================================================================');
  console.log(`🤖 ${t.title}`);
  console.log('========================================================================\n');
  console.log(t.premise + '\n');
  console.log(`Timestamp: ${report.timestamp}`);
  console.log(`Verdict: ${report.summary.verdict}`);
  console.log(`${t.overall}: ${report.summary.overallPercentage}% (${report.summary.passedChecks}/${report.summary.totalChecks})  |  P0 gaps: ${report.summary.p0Gaps}  |  total gaps: ${report.summary.totalGaps}`);

  console.log('\n------------------------------------------------------------------------');
  console.log(t.dimensions);
  console.log('------------------------------------------------------------------------\n');
  for (const d of report.dimensions) {
    console.log(`${icon(d.status)} ${d.id}: ${d.name} — ${d.percentage}%  [${t.owner}: ${d.owner}]`);
    if (d.note) console.log(`     ↳ ${d.note}`);
    for (const r of d.results) {
      console.log(`   ${r.satisfied ? '✓' : '✗'} [${r.severity}] ${r.name}`);
    }
    console.log('');
  }

  console.log('------------------------------------------------------------------------');
  console.log(t.gaps);
  console.log('------------------------------------------------------------------------\n');
  if (report.gaps.length === 0) { console.log(t.none); }
  else {
    const order = { P0: 0, P1: 1, P2: 2, INFO: 3 };
    for (const g of [...report.gaps].sort((a, b) => order[a.severity] - order[b.severity])) {
      console.log(`• [${g.severity}] (${g.dim}/${g.owner}) ${g.name}`);
      console.log(`    ${t.risk}: ${g.risk}`);
      console.log(`    ${t.fix}: ${g.fix}`);
    }
  }
  console.log('\n========================================================================');
  console.log(t.end);
  console.log('========================================================================\n');
}

function printGapFormat(report) {
  console.log('\n========================================================================');
  console.log('📋 GAP-TRACKING FORMAT — SDLC ↔ INTERFACE');
  console.log('========================================================================\n');
  const order = { P0: 0, P1: 1, P2: 2, INFO: 3 };
  const gaps = [...report.gaps].sort((a, b) => order[a.severity] - order[b.severity]);
  console.log('| Severity | Dimension | Owner | Gap | Risk | Recommendation |');
  console.log('|---|---|---|---|---|---|');
  for (const g of gaps) {
    console.log(`| ${g.severity} | ${g.dim} | ${g.owner} | ${g.name} | ${g.risk} | ${g.fix} |`);
  }
  console.log('');
}

async function main() {
  const args = process.argv.slice(2);
  const lang = args.includes('--es') ? 'es' : 'en';
  const t = I18N[lang];
  const reportOnly = args.includes('--report');
  const gapFormat = args.includes('--gap-format');
  const strict = args.includes('--strict');
  const dimArg = args.find((a) => a.startsWith('--dim'));

  let dims = DIMENSIONS;
  if (dimArg) {
    const id = (dimArg.split('=')[1] || args[args.indexOf(dimArg) + 1] || '').toUpperCase();
    dims = DIMENSIONS.filter((d) => d.id === id);
    if (dims.length === 0) { console.error(`Unknown dimension ${id}. Valid: D1..D11`); process.exit(1); }
  }

  // Build report (respecting single-dimension filter)
  const original = DIMENSIONS.splice(0, DIMENSIONS.length, ...dims);
  const report = await generateReport();
  DIMENSIONS.splice(0, DIMENSIONS.length, ...original);

  if (reportOnly) console.log(JSON.stringify(report, null, 2));
  else if (gapFormat) printGapFormat(report);
  else printReport(report, t);

  const blocking = strict ? report.summary.totalGaps : report.summary.p0Gaps;
  process.exit(blocking > 0 ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
