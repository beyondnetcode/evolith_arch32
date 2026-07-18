/**
 * GT-438 — real workspace-context assembly for the inline Core evaluation.
 *
 * The stateless Core evaluates exactly the satellite content it is handed in
 * `evaluationInput.files`; without assembly the runtime sent an EMPTY context and
 * the Core reported GOV-000-style "nothing to evaluate" findings. These tests
 * pin that:
 *   1. when a workspace-context assembler is wired, the runtime carries the
 *      assembled files INLINE into the Core `evaluate()` call;
 *   2. without an assembler the prior workspaceRef-only flow is preserved
 *      (no `evaluationInput`);
 *   3. the pure `buildEvaluationContext` mapper attaches files only when present;
 *   4. the production `FsWorkspaceContextAdapter` walks a corpus deterministically
 *      (driven by an in-memory fs seam — no real disk).
 */

import { createAgentRuntime } from '../bootstrap';
import { buildEvaluationContext } from '../application/context-mapper';
import { parseAgentRuntimeRequest } from '../domain/contracts/agent-runtime-request';
import { FsWorkspaceContextAdapter, type WorkspaceFsLike } from '../adapters/core/fs-workspace-context.adapter';
import type { ICoreEvaluationPort, RuntimeEvaluationContext, EvaluationResult } from '../domain/ports/core-evaluation.port';
import type { IWorkspaceContextPort } from '../domain/ports/workspace-context.port';
import type { SkillDescriptor } from '../domain/contracts/capability';

const FIXED_NOW = '2026-07-17T00:00:00.000Z';

function discoveryRequest() {
  return parseAgentRuntimeRequest({
    tenant: 'tenant_demo',
    product: 'evolith_tracker',
    initiative: 'init_001',
    phase: 'discovery',
    gate: 'prd_readiness',
    intent: 'validate_discovery_gate',
    tool: 'validate-discovery-gate',
    workspace_ref: 'satellite-corpus',
    correlation_id: 'corr-1',
    parameters: { requiredArtifacts: ['prd'], presentArtifacts: ['prd'], gate: 'prd_readiness' },
  });
}

/** A canonical PASS result the spy Core returns. */
const canned = (): EvaluationResult =>
  ({
    overallVerdict: 'PASS',
    outcome: 'approved',
    results: {},
    rulesExecuted: [],
    policiesApplied: [],
    gaps: [],
    risks: [],
    missingEvidence: [],
    incompleteArtifacts: [],
    recommendations: [],
    requiredActions: [],
    confidence: 1,
    rationale: 'spy',
    versions: { core: '1.0.0' },
    evaluatedAt: FIXED_NOW,
    correlationId: 'corr-1',
    schemaVersion: '1.0.0',
  } as unknown as EvaluationResult);

/** Records the exact context handed to the Core. */
class SpyCore implements ICoreEvaluationPort {
  public last?: RuntimeEvaluationContext;
  async evaluate(context: RuntimeEvaluationContext): Promise<EvaluationResult> {
    this.last = context;
    return canned();
  }
}

/** Deterministic fixture assembler — no filesystem. */
class FixtureWorkspace implements IWorkspaceContextPort {
  constructor(private readonly files: Record<string, string>) {}
  async assemble() {
    return { files: this.files, sourceRef: 'fixture' };
  }
}

describe('workspace-context assembly (GT-438)', () => {
  it('carries the assembled files INLINE into the Core evaluate() call', async () => {
    const core = new SpyCore();
    const workspaceContext = new FixtureWorkspace({
      'evolith.yaml': 'coreRef:\n  version: 1.0.0\n',
      'docs/prd.md': '# PRD\n',
    });
    const { runtime } = createAgentRuntime({ now: () => FIXED_NOW, coreEvaluation: core, workspaceContext });

    const result = await runtime.handle(discoveryRequest());

    expect(result.status).toBe('passed');
    expect(core.last).toBeDefined();
    expect(core.last!.evaluationInput?.files['evolith.yaml']).toContain('coreRef');
    expect(core.last!.evaluationInput?.files['docs/prd.md']).toBe('# PRD\n');
    // The assembly step is recorded in the provenance trace.
    expect(result.trace.steps).toContain('assemble-workspace');
    expect(result.trace.steps).toContain('core-evaluate');
  });

  it('preserves the workspaceRef-only flow when no assembler is wired (no evaluationInput)', async () => {
    const core = new SpyCore();
    const { runtime } = createAgentRuntime({ now: () => FIXED_NOW, coreEvaluation: core });

    await runtime.handle(discoveryRequest());

    expect(core.last).toBeDefined();
    expect(core.last!.evaluationInput).toBeUndefined();
    expect(core.last!.workspaceRef).toBe('satellite-corpus');
  });

  it('never blocks the governed run when the assembler throws (advisory)', async () => {
    const core = new SpyCore();
    const workspaceContext: IWorkspaceContextPort = {
      assemble: async () => {
        throw new Error('corpus unreachable');
      },
    };
    const { runtime } = createAgentRuntime({ now: () => FIXED_NOW, coreEvaluation: core, workspaceContext });

    const result = await runtime.handle(discoveryRequest());

    expect(result.status).toBe('passed'); // degrades to ungrounded, does not error
    expect(core.last!.evaluationInput).toBeUndefined();
  });

  it('does not send evaluationInput when the assembler returns an empty file map', async () => {
    const core = new SpyCore();
    const { runtime } = createAgentRuntime({
      now: () => FIXED_NOW,
      coreEvaluation: core,
      workspaceContext: new FixtureWorkspace({}),
    });

    await runtime.handle(discoveryRequest());

    expect(core.last!.evaluationInput).toBeUndefined();
  });
});

describe('buildEvaluationContext file mapping (GT-438)', () => {
  const skill: SkillDescriptor = {
    id: 'validate-discovery-gate',
    kind: 'evaluation',
    evaluationKinds: ['gate'],
  } as unknown as SkillDescriptor;

  it('attaches evaluationInput.files when files are present', () => {
    const ctx = buildEvaluationContext(discoveryRequest(), skill, undefined, { 'evolith.yaml': 'x' });
    expect(ctx.evaluationInput?.files).toEqual({ 'evolith.yaml': 'x' });
  });

  it('omits evaluationInput when no files are assembled', () => {
    expect(buildEvaluationContext(discoveryRequest(), skill).evaluationInput).toBeUndefined();
    expect(buildEvaluationContext(discoveryRequest(), skill, undefined, {}).evaluationInput).toBeUndefined();
  });
});

describe('FsWorkspaceContextAdapter (GT-438)', () => {
  /** Build an in-memory fs seam over a flat { absPath: content } tree. */
  function memFs(tree: Record<string, string>): WorkspaceFsLike {
    const dirs = new Set<string>();
    const files = new Map<string, string>();
    for (const [p, c] of Object.entries(tree)) {
      files.set(p, c);
      let d = p.slice(0, p.lastIndexOf('/'));
      while (d) {
        dirs.add(d);
        d = d.slice(0, d.lastIndexOf('/'));
      }
    }
    return {
      async readdir(dir) {
        const prefix = `${dir}/`;
        const names = new Set<string>();
        const out: Array<{ name: string; isDirectory(): boolean; isFile(): boolean }> = [];
        for (const key of [...files.keys(), ...[...dirs].map((x) => `${x}/`)]) {
          const raw = key.endsWith('/') ? key.slice(0, -1) : key;
          if (!raw.startsWith(prefix)) continue;
          const rest = raw.slice(prefix.length);
          const seg = rest.split('/')[0];
          if (!seg || names.has(seg)) continue;
          names.add(seg);
          const abs = `${dir}/${seg}`;
          const isDir = dirs.has(abs);
          out.push({ name: seg, isDirectory: () => isDir, isFile: () => !isDir });
        }
        return out;
      },
      async readFile(file) {
        const c = files.get(file);
        if (c === undefined) throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
        return c;
      },
    };
  }

  it('walks the corpus and returns relative-posix keyed content, skipping excluded dirs/extensions', async () => {
    const fsImpl = memFs({
      '/corpus/evolith.yaml': 'coreRef: 1',
      '/corpus/docs/prd.md': '# PRD',
      '/corpus/src/index.ts': 'export {}', // excluded extension
      '/corpus/node_modules/pkg/readme.md': 'noise', // excluded dir
    });
    const adapter = new FsWorkspaceContextAdapter({ root: '/corpus', fsImpl });

    const { files, sourceRef } = await adapter.assemble({});

    expect(Object.keys(files).sort()).toEqual(['docs/prd.md', 'evolith.yaml']);
    expect(files['evolith.yaml']).toBe('coreRef: 1');
    expect(sourceRef).toBe('/corpus');
  });

  it('honours the maxFiles budget and flags truncation', async () => {
    const fsImpl = memFs({
      '/corpus/a.md': '1',
      '/corpus/b.md': '2',
      '/corpus/c.md': '3',
    });
    const adapter = new FsWorkspaceContextAdapter({ root: '/corpus', fsImpl, maxFiles: 2 });

    const { files, truncated } = await adapter.assemble({});

    expect(Object.keys(files)).toHaveLength(2);
    expect(truncated).toBe(true);
  });
});
