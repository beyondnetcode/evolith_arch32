/**
 * Derived interface how-to generator.
 *
 * Single source of truth — it composes the CERTIFIED artefacts instead of
 * hand-writing prose that drifts:
 *   1. surface-parity-matrix.json      → operation identity + surface exposure.
 *   2. BINDINGS (this suite)           → the EXACT, tested CLI/MCP/REST request.
 *   3. .out/howto-capture.json         → each MCP tool's inputSchema + the REAL
 *                                        response envelope every surface returned
 *                                        (emitted by exploration.spec.ts).
 *   4. CLI @Option / REST @ApiProperty → the flag / field catalogues.
 * Every request below is what actually ran and every response block is the SHAPE
 * of what actually came back, so the docs cannot diverge from reality. A CI check
 * (the drift test in exploration.spec.ts) enforces it byte-for-byte.
 *
 * Run: npx ts-node --project src/tests/exploration/tsconfig.json \
 *        src/tests/exploration/gen-howto.ts [phase|all]
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { BINDINGS } from './bindings';
import { REPO_ROOT } from './catalog';
import type { BindingCtx } from './types';

const CTX: BindingCtx = {
  projectPath: '/abs/path/to/your-satellite',
  workspaceRef: 'your-satellite',
  corePath: '/abs/path/to/evolith-core',
};

interface MatrixOp {
  id: string; name: string; description: string;
  cli: { exposed: boolean; command?: string; exempt?: string };
  mcp: { exposed: boolean; tool?: string; exempt?: string };
  rest: { exposed: boolean; endpoint?: string; exempt?: string };
}
interface Capture {
  mcpTools: Record<string, { properties?: Record<string, { type?: string; description?: string }>; required?: string[] }>;
  responses: Record<string, Partial<Record<'cli' | 'mcp' | 'rest', unknown>>>;
}

export const PHASES: Record<string, { title: string; blurb: string; ops: string[] }> = {
  discovery: {
    title: 'Discovery',
    blurb: 'Frame the initiative and check the discovery gate before committing to a design.',
    ops: ['gate-evaluate', 'sdlc-status', 'moscow-report', 'topology-list', 'phase-requirements'],
  },
  design: {
    title: 'Design',
    blurb: 'Choose a topology, record decisions, and confirm the design gate.',
    ops: ['recommend-topology', 'topology-get', 'gate-evaluate', 'adr-crud', 'phase-advance', 'sdlc-handoff'],
  },
  construction: {
    title: 'Construction',
    blurb:
      'Build the system against the design: scaffold the workspace, generate ' +
      'domain code, then validate and gate what you built. Every operation is ' +
      'stateless — the Core evaluates the context you send and returns a verdict.',
    ops: [
      'scaffold-architecture', 'sdlc-generate', 'validate-satellite', 'composable-validate',
      'detect-drift', 'evaluate', 'gate-evaluate', 'phase-artifacts-evaluate',
    ],
  },
  qa: {
    title: 'QA',
    blurb: 'Validate quality gates and downstream-phase artifact completeness.',
    ops: ['validate-satellite', 'composable-validate', 'phase-artifacts-evaluate', 'gate-evaluate', 'dora-metrics'],
  },
  release: {
    title: 'Release',
    blurb: 'Advance the final phase gate and read delivery/operations signals.',
    ops: ['gate-evaluate', 'phase-advance', 'dora-metrics', 'detect-drift', 'health-check'],
  },
};

const CLI_SOURCES: Record<string, string> = {
  'scaffold-architecture': 'src/sdk/cli/src/commands/architecture/scaffold.command.ts',
  'sdlc-generate': 'src/sdk/cli/src/commands/sdlc/generate-domain.command.ts',
  'validate-satellite': 'src/sdk/cli/src/commands/validate/validate.command.ts',
  'composable-validate': 'src/sdk/cli/src/commands/validate/validate.command.ts',
  'detect-drift': 'src/sdk/cli/src/commands/drift/drift.command.ts',
  'evaluate': 'src/sdk/cli/src/commands/evaluate/evaluate.command.ts',
  'gate-evaluate': 'src/sdk/cli/src/commands/gate/gate.command.ts',
  'phase-artifacts-evaluate': 'src/sdk/cli/src/commands/topology/phase-artifacts.command.ts',
  'recommend-topology': 'src/sdk/cli/src/commands/topology/recommend.command.ts',
  'sdlc-status': 'src/sdk/cli/src/commands/sdlc/gate-status.command.ts',
  'dora-metrics': 'src/sdk/cli/src/commands/sdlc/gate-status.command.ts',
};

const REST_DTO: Record<string, { file: string; cls: string }> = {
  'validate-satellite': { file: 'src/apps/core-api/src/presentation/dtos/architecture.dto.ts', cls: 'ValidateSatelliteDto' },
  'composable-validate': { file: 'src/apps/core-api/src/presentation/controllers/composable-validate.controller.ts', cls: 'ComposableValidateDto' },
  'evaluate': { file: 'src/apps/core-api/src/presentation/dtos/evaluation.dto.ts', cls: 'EvaluationContextDto' },
  'detect-drift': { file: 'src/apps/core-api/src/presentation/dtos/architecture.dto.ts', cls: 'DetectDriftDto' },
  'phase-artifacts-evaluate': { file: 'src/apps/core-api/src/presentation/dtos/architecture.dto.ts', cls: 'EvaluatePhaseArtifactsDto' },
  'recommend-topology': { file: 'src/apps/core-api/src/presentation/dtos/architecture.dto.ts', cls: 'RecommendTopologyDto' },
};

export function loadMatrix(): Record<string, MatrixOp> {
  const ops = (JSON.parse(readFileSync(join(REPO_ROOT, 'reference/core/control-center/audits/surface-parity-matrix.json'), 'utf-8')) as { operations: MatrixOp[] }).operations;
  return Object.fromEntries(ops.map((o) => [o.id, o]));
}
export function loadCapture(): Capture {
  const p = join(REPO_ROOT, 'src/tests/exploration/.out/howto-capture.json');
  if (!existsSync(p)) throw new Error('Missing .out/howto-capture.json — run `npm run test:exploration` first to capture live schemas + responses.');
  return JSON.parse(readFileSync(p, 'utf-8')) as Capture;
}

function extractCliOptions(rel: string): Array<{ flags: string; description: string }> {
  if (!rel) return [];
  const path = join(REPO_ROOT, rel);
  if (!existsSync(path)) return [];
  const src = readFileSync(path, 'utf-8');
  const out: Array<{ flags: string; description: string }> = [];
  const re = /@Option\(\{[\s\S]*?flags:\s*'([^']+)'[\s\S]*?description:\s*'([^']*)'/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) out.push({ flags: m[1], description: m[2] });
  return out;
}

function extractRestOptions(op: string): Array<{ field: string; required: boolean; description: string }> {
  const dto = REST_DTO[op];
  if (!dto || !existsSync(join(REPO_ROOT, dto.file))) return [];
  const src = readFileSync(join(REPO_ROOT, dto.file), 'utf-8');
  const start = src.indexOf(`class ${dto.cls}`);
  if (start < 0) return [];
  const body = src.slice(start, src.indexOf('\n}', start));
  const out: Array<{ field: string; required: boolean; description: string }> = [];
  const re = /@(ApiProperty|ApiPropertyOptional)\(\{[\s\S]*?description:\s*'([^']*)'[\s\S]*?\}\)[\s\S]*?(\w+)([!?]):/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body)) !== null) out.push({ field: m[3], required: m[4] === '!', description: m[2] });
  return out;
}

function mcpOptions(schema: Capture['mcpTools'][string] | undefined): Array<{ name: string; type: string; required: boolean; description: string }> {
  if (!schema?.properties) return [];
  const required = new Set(schema.required ?? []);
  return Object.entries(schema.properties).map(([name, p]) => ({
    name, type: p.type ?? 'any', required: required.has(name), description: p.description ?? '',
  }));
}

function fence(lang: string, body: string): string { return '```' + lang + '\n' + body + '\n```'; }

/**
 * The CONTRACT of a captured envelope: its shape, not its content.
 *
 * These documents are DERIVED from a live capture and then compared byte-for-byte
 * by the drift check, so the rendering has to be a function of the INTERFACE and
 * nothing else. Embedding the captured envelope verbatim was not: it carried the
 * corpus and the workspace of whichever machine ran the capture, and every field
 * that did so had to be subtracted by hand, one at a time, after CI went red.
 * That list only ever grew — `rulesChecked`, then the ruleId arrays, then
 * `perRuleset`, then `confidence` — because a DENYLIST can only name the
 * volatility somebody has already been bitten by.
 *
 * It is inverted here. A leaf value is printed only if its key is on
 * CONTRACT_VALUE_KEYS below; everything else becomes a placeholder naming its
 * TYPE. A field the engine adds tomorrow therefore cannot break the check: it
 * shows up as `"<number>"` and stays that way whatever it computes. What the
 * reader needs — every field name, its type, the request that produced it — is
 * exactly what survives.
 *
 * What the check can still catch, which is the point of keeping it: a field
 * appearing or disappearing, a type changing, and the values that ARE the
 * contract (the command/tool/endpoint identity, the error code vocabulary, the
 * envelope's schemaVersion).
 *
 * Two earlier fixes stay in force and are folded into the projection:
 *
 *  1. **Arrays carried filesystem order.** Several envelope fields are built by
 *     walking directories, and `readdir` does not return the same order on APFS
 *     and on the runner's ext4. Arrays now collapse to ONE element that merges
 *     every element observed (union of keys, union of types), so element order
 *     cannot reach the page at all — and no order has to be invented for arrays
 *     of objects, which was the reason they were left alone before.
 *
 *  2. **The cut was a byte offset.** `slice(0, 1400)` lands mid-token, so a value
 *     growing by two characters — `181` becoming `189` — shifted every following
 *     line and changed which ids were visible. Truncation happens at a line
 *     boundary. It is now a guard against a pathological envelope rather than a
 *     routine event: collapsing arrays takes the largest captured envelope from
 *     ~413 KB (`evaluate`, on MCP) to 4.5 KB rendered, under the budget below, so
 *     no block is cut today and the reader sees every field name.
 */
const CONTRACT_VALUE_KEYS = new Set([
  'success', // the ADR-0073 discriminator; `true` next to a failing verdict is itself the lesson
  'command', // the CLI command / HTTP route that was invoked — interface identity
  'tool', //    the MCP tool name — interface identity
  'code', //    the error vocabulary (NOT_FOUND, FORBIDDEN, …), which callers branch on
  'schemaVersion', // the envelope contract version; a bump is a real contract change
]);

const PLACEHOLDER = /^<[a-z|]+>$/;

function typeTokens(shape: unknown): string[] {
  if (shape === null) return ['null'];
  if (Array.isArray(shape)) return ['array'];
  if (typeof shape === 'object') return ['object'];
  if (typeof shape === 'string' && PLACEHOLDER.test(shape)) return shape.slice(1, -1).split('|');
  return [typeof shape]; // an allowlisted literal degrades to its type when it meets a different one
}

function placeholder(tokens: string[]): string {
  return `<${[...new Set(tokens)].sort().join('|')}>`;
}

/** Merge two projected shapes. Commutative and associative, so element order cannot leak. */
function mergeShapes(a: unknown, b: unknown): unknown {
  if (a === undefined) return b;
  if (b === undefined) return a;
  if (Array.isArray(a) && Array.isArray(b)) {
    const items = [...a, ...b];
    return items.length === 0 ? [] : [items.reduce((x, y) => mergeShapes(x, y))];
  }
  const isObj = (v: unknown): v is Record<string, unknown> =>
    v !== null && typeof v === 'object' && !Array.isArray(v);
  if (isObj(a) && isObj(b)) {
    const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])].sort((x, y) => x.localeCompare(y));
    return Object.fromEntries(keys.map((k) => [k, mergeShapes(a[k], b[k])]));
  }
  if (JSON.stringify(a) === JSON.stringify(b)) return a;
  return placeholder([...typeTokens(a), ...typeTokens(b)]);
}

function contractShape(value: unknown, key: string | null): unknown {
  if (Array.isArray(value)) {
    const items = value.map((v) => contractShape(v, key));
    return items.length === 0 ? [] : [items.reduce((x, y) => mergeShapes(x, y))];
  }
  if (value && typeof value === 'object') {
    // Key order is fixed too: `JSON.stringify` preserves insertion order, and
    // insertion order comes from whatever built the object.
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => [k, contractShape(v, k)]),
    );
  }
  if (value === null) return null;
  if (key !== null && CONTRACT_VALUE_KEYS.has(key)) return value;
  return placeholder([typeof value]);
}

// Headroom over the largest rendered shape (4,566 bytes) so that the cut is a
// backstop, not a routine event. A block that hits it loses field names, which is
// the one thing the reader cannot do without.
const ENVELOPE_BUDGET = 8000;

function responseBlock(env: unknown): string {
  if (env == null) return '_No parseable envelope captured._';
  const lines = JSON.stringify(contractShape(env, null), null, 2).split('\n');

  const kept: string[] = [];
  let size = 0;
  for (const line of lines) {
    if (size + line.length + 1 > ENVELOPE_BUDGET) break;
    kept.push(line);
    size += line.length + 1;
  }

  const s = kept.length === lines.length
    ? kept.join('\n')
    : `${kept.join('\n')}\n  … (truncated, ${lines.length - kept.length} more line(s))`;

  return 'Response shape (captured live):\n' + fence('json', s);
}

function renderOp(op: MatrixOp, cap: Capture): string {
  const b = BINDINGS[op.id];
  const resp = cap.responses[op.id] ?? {};
  const L: string[] = [];
  L.push(`### ${op.name}\n`);
  L.push(`> \`${op.id}\` — ${op.description}\n`);

  // CLI
  L.push('#### CLI');
  if (!op.cli.exposed) L.push(`_Not on CLI — ${op.cli.exempt ?? 'exempt'}._`);
  else if (b?.cli) {
    L.push(`Command: \`evolith-cli ${op.cli.command}\`\n`);
    const opts = extractCliOptions(CLI_SOURCES[op.id] ?? '');
    if (opts.length) {
      L.push('| Flag | Description |', '| --- | --- |');
      for (const o of opts) L.push(`| \`${o.flags}\` | ${o.description || '—'} |`);
      L.push('');
    }
    L.push('Example:', fence('bash', `evolith-cli ${b.cli(CTX).join(' ')}`), responseBlock(resp.cli));
  } else { L.push(`Command: \`evolith-cli ${op.cli.command}\`\n\n> ⚠ Exposed on CLI but not yet in the conformance bindings — no worked example derived.`); }

  // MCP
  L.push('\n#### MCP');
  if (!op.mcp.exposed) L.push(`_Not on MCP — ${op.mcp.exempt ?? 'exempt'}._`);
  else if (b?.mcp) {
    const { tool, args } = b.mcp(CTX);
    L.push(`Tool: \`${tool}\`\n`);
    const opts = mcpOptions(cap.mcpTools[tool]);
    if (opts.length) {
      L.push('| Argument | Type | Req. | Description |', '| --- | --- | --- | --- |');
      for (const o of opts) L.push(`| \`${o.name}\` | ${o.type} | ${o.required ? '✓' : '' } | ${o.description || '—'} |`);
      L.push('');
    }
    L.push('Example (`tools/call`):', fence('json', JSON.stringify({ name: tool, arguments: args }, null, 2)), responseBlock(resp.mcp));
  } else { L.push(`Tool: \`${op.mcp.tool}\`\n\n> ⚠ Exposed on MCP but not yet in the conformance bindings — no worked example derived.`); }

  // REST
  L.push('\n#### REST');
  if (!op.rest.exposed) L.push(`_Not on REST — ${op.rest.exempt ?? 'exempt'}._`);
  else if (b?.rest) {
    const { method, path, body } = b.rest(CTX);
    L.push(`Endpoint: \`${op.rest.endpoint}\`\n`);
    const opts = extractRestOptions(op.id);
    if (opts.length) {
      L.push('| Field | Req. | Description |', '| --- | --- | --- |');
      for (const o of opts) L.push(`| \`${o.field}\` | ${o.required ? '✓' : ''} | ${o.description || '—'} |`);
      L.push('');
    }
    L.push('Example:', fence('http', `${method} ${path}\nContent-Type: application/json\n\n${JSON.stringify(body ?? {}, null, 2)}`), responseBlock(resp.rest));
  } else { L.push(`Endpoint: \`${op.rest.endpoint}\`\n\n> ⚠ Exposed on REST but not yet in the conformance bindings — no worked example derived.`); }

  L.push('\n---\n');
  return L.join('\n');
}

export function renderPhase(phaseKey: string, matrix: Record<string, MatrixOp>, cap: Capture): string {
  const phase = PHASES[phaseKey];
  const header = [
    `# Interface How-To — ${phase.title} phase`, '',
    '<!-- GENERATED by src/tests/exploration/gen-howto.ts — do not edit by hand.',
    '     Requests derive from the tested exploration bindings; responses + MCP',
    '     schemas from .out/howto-capture.json; option tables from @Option /',
    '     inputSchema / @ApiProperty. exploration.spec.ts fails CI on drift. -->', '',
    phase.blurb, '',
    '**Envelope:** every response is an ADR-0073 envelope `{ success, data | error: { code, message }, meta }`.',
    '**Exit codes (CLI):** `0` on a passing verdict, non-zero on a failing verdict or error.',
    '**Mutative MCP tools** require `{ "apply": true, "approvalToken": "…" }` (the dispatch gates them; `RULESET_NOT_FOUND` etc. are consistent across surfaces).',
    '**Reading the response blocks:** they are the SHAPE of what the interface really returned, not a sample of data. ' +
      'Every field name is real and every value carries its type — `"<string>"`, `"<number>"` — because what a rule ' +
      'counts or a gate decides depends on the workspace being evaluated, not on the interface. An array is shown as a ' +
      'single element merging every element observed. Values that ARE the contract are printed literally: ' +
      '`success`, `command`/`tool`, the error `code`, and `schemaVersion`.', '',
    `Operations in this phase: ${phase.ops.map((o) => `\`${o}\``).join(', ')}.`, '', '---', '',
  ].join('\n');
  const body = phase.ops.map((id) => (matrix[id] ? renderOp(matrix[id], cap) : `> ⚠ \`${id}\` not in the surface-parity matrix.\n`)).join('\n');
  return header + body;
}

function main(): void {
  const arg = process.argv[2] || 'construction';
  const matrix = loadMatrix();
  const cap = loadCapture();
  const keys = arg === 'all' ? Object.keys(PHASES) : [arg];
  for (const k of keys) {
    if (!PHASES[k]) throw new Error(`Unknown phase '${k}'. Known: ${Object.keys(PHASES).join(', ')}, all`);
    const out = join(REPO_ROOT, `reference/core/interfaces/how-to-${k}.md`);
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, renderPhase(k, matrix, cap), 'utf-8');
    // eslint-disable-next-line no-console
    console.log(`[gen-howto] wrote reference/core/interfaces/how-to-${k}.md (${PHASES[k].ops.length} ops)`);
  }
}

if (require.main === module) main();
