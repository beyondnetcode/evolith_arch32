import { CliExecutor, RestExecutor, McpExecutor } from './executors';
import { BINDINGS, Binding } from './bindings';
import { checkEnvelope, checkConsistency, resetFindingSeq } from './oracles';
import { loadCatalog, triangleOps, countExposed } from './catalog';
import { writeReport, writeProposedGaps } from './findings';
import {
  BindingCtx,
  Finding,
  RawResult,
  CoverageReport,
  Surface,
} from './types';

export interface Harness {
  cli: CliExecutor;
  rest: RestExecutor;
  mcp: McpExecutor;
  ctx: BindingCtx;
}

export interface RunResult {
  findings: Finding[];
  coverage: CoverageReport;
  /** Raw results keyed by operationId, for assertions in the spec. */
  byOperation: Record<string, RawResult[]>;
}

/**
 * Execute one bound operation on every surface its binding declares, then run
 * the envelope + consistency oracles over the results.
 */
async function runOperation(
  operationId: string,
  binding: Binding,
  h: Harness,
): Promise<{ results: RawResult[]; findings: Finding[] }> {
  const results: RawResult[] = [];

  if (binding.cli) {
    results.push(await h.cli.run(operationId, binding.cli(h.ctx)));
  }
  if (binding.mcp) {
    const { tool, args } = binding.mcp(h.ctx);
    results.push(await h.mcp.run(operationId, tool, args));
  }
  if (binding.rest) {
    const { method, path, body } = binding.rest(h.ctx);
    results.push(await h.rest.run(operationId, method, path, body));
  }

  const findings: Finding[] = [];
  for (const r of results) {
    const f = checkEnvelope(r);
    if (f) findings.push(f);
  }
  findings.push(...checkConsistency(operationId, results, binding.verified));

  return { results, findings };
}

export async function runExploration(h: Harness, outDir: string): Promise<RunResult> {
  resetFindingSeq();
  const catalog = loadCatalog();
  const triangle = triangleOps(catalog);
  const boundIds = Object.keys(BINDINGS);

  const allFindings: Finding[] = [];
  const byOperation: Record<string, RawResult[]> = {};
  let executedSurfaceInvocations = 0;

  for (const [operationId, binding] of Object.entries(BINDINGS)) {
    const { results, findings } = await runOperation(operationId, binding, h);
    byOperation[operationId] = results;
    executedSurfaceInvocations += results.length;
    allFindings.push(...findings);
  }

  const exposed = countExposed(catalog);
  const uncoveredTriangleOps = triangle.map((o) => o.id).filter((id) => !boundIds.includes(id));

  const coverage: CoverageReport = {
    totalOperations: catalog.length,
    exposed,
    fullTriangle: triangle.length,
    boundOperations: boundIds.length,
    executedOperations: Object.keys(byOperation).length,
    executedSurfaceInvocations,
    findingsByType: tally(allFindings, (f) => f.type),
    findingsBySeverity: tally(allFindings, (f) => f.severity),
    uncoveredTriangleOps,
  };

  writeReport(outDir, allFindings, coverage);
  writeProposedGaps(outDir, allFindings);

  return { findings: allFindings, coverage, byOperation };
}

function tally<T>(items: T[], key: (t: T) => string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const it of items) {
    const k = key(it);
    out[k] = (out[k] || 0) + 1;
  }
  return out;
}

export type { Surface };
