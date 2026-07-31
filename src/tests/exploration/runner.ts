import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { CliExecutor, RestExecutor, McpExecutor } from './executors';
import { BINDINGS, Binding } from './bindings';
import {
  checkEnvelope,
  checkConsistency,
  checkNoEffect,
  checkNoEffectContrast,
  resetFindingSeq,
} from './oracles';
import { loadCatalog, triangleOps, countExposed } from './catalog';
import { writeReport, writeProposedGaps } from './findings';
import { NO_EFFECT_CONTRACTS, NoEffectContract, NoEffectInvocation } from './no-effect-contracts';
import { diffTrees, snapshotTree, TreeDiff } from './state';
import {
  BindingCtx,
  Finding,
  RawResult,
  CoverageReport,
  NoEffectCoverage,
  Surface,
} from './types';

export interface Harness {
  cli: CliExecutor;
  rest: RestExecutor;
  mcp: McpExecutor;
  ctx: BindingCtx;
  /**
   * GT-643 — a FRESH CLI executor per invocation.
   *
   * The no-effect phase cannot reuse `cli`. A shared nest-commander module
   * carries commander's parsed options forward between runs: `agents install`
   * after `agents install --dry-run` still saw `dryRun=true` and wrote nothing,
   * which reads as the product being correct when it is the harness holding
   * state. The contrast case — the half that makes this oracle falsifiable —
   * is exactly the run that would be poisoned.
   *
   * Supplied by the spec, which owns the CLI module graph; the runner only asks.
   */
  freshCli?: () => Promise<CliExecutor>;
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

// -------------------------------------------------------------------------
// GT-643 — the no-effect phase.
// -------------------------------------------------------------------------

/**
 * Run one invocation of a no-effect contract on one surface, inside a FRESH
 * sandbox that is also the process cwd, and return what moved.
 *
 * The sandbox is both the isolation and the instrument. `agents install` writes
 * to `process.cwd()`, so running it anywhere else would watch the wrong
 * directory — and running it in the repository is how the original defect got
 * three tracked files committed. Nothing is restored afterwards because nothing
 * outside the sandbox is written; the sandbox is discarded whole.
 */
async function runNoEffectInvocation(
  h: Harness,
  contract: NoEffectContract,
  surface: Surface,
  invocation: NoEffectInvocation,
): Promise<TreeDiff[] | null> {
  const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'evolith-noeffect-'));
  const extraRoots = contract.extraRoots?.(h.ctx) ?? [];
  const roots = [sandbox, ...extraRoots];
  const originalCwd = process.cwd();
  try {
    process.chdir(sandbox);
    const before = roots.map((r) => snapshotTree(r));

    if (surface === 'cli') {
      if (!invocation.cli || !h.freshCli) return null;
      const cli = await h.freshCli();
      await cli.run(contract.id, invocation.cli);
    } else if (surface === 'mcp') {
      if (!invocation.mcp) return null;
      await h.mcp.run(contract.id, invocation.mcp.tool, invocation.mcp.args);
    } else {
      if (!invocation.rest) return null;
      await h.rest.run(contract.id, invocation.rest.method, invocation.rest.path, invocation.rest.body);
    }

    const after = roots.map((r) => snapshotTree(r));
    return before.map((b, i) => diffTrees(b, after[i]));
  } finally {
    process.chdir(originalCwd);
    fs.rmSync(sandbox, { recursive: true, force: true });
  }
}

async function runNoEffectPhase(
  h: Harness,
): Promise<{ findings: Finding[]; coverage: NoEffectCoverage }> {
  const findings: Finding[] = [];
  const skipped: string[] = [];
  let checked = 0;
  let contrastVerified = 0;

  for (const contract of NO_EFFECT_CONTRACTS) {
    let executedAnySurface = false;
    for (const surface of contract.surfaces) {
      const diffs = await runNoEffectInvocation(h, contract, surface, contract.invocation);
      if (diffs === null) continue;
      executedAnySurface = true;
      checked += 1;
      findings.push(...checkNoEffect(contract.id, contract.flag, surface, diffs));

      const contrastDiffs = await runNoEffectInvocation(h, contract, surface, contract.contrast);
      if (contrastDiffs === null) {
        // A contract with no runnable contrast is reported, never silently
        // downgraded to a bare no-effect assertion.
        findings.push(...checkNoEffectContrast(contract.id, contract.flag, surface, []));
        continue;
      }
      const contrastFindings = checkNoEffectContrast(contract.id, contract.flag, surface, contrastDiffs);
      if (contrastFindings.length === 0) contrastVerified += 1;
      findings.push(...contrastFindings);
    }
    if (!executedAnySurface) skipped.push(contract.id);
  }

  return {
    findings,
    coverage: {
      contracts: NO_EFFECT_CONTRACTS.length,
      checked,
      contrastVerified,
      skipped,
    },
  };
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

  // GT-643 — the state phase runs AFTER the reply phase: it chdirs into
  // throwaway sandboxes, and the reply bindings depend on the cwd the spec set.
  const noEffect = await runNoEffectPhase(h);
  allFindings.push(...noEffect.findings);

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
    noEffect: noEffect.coverage,
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
