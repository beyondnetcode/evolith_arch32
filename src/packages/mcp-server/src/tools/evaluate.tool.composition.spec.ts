/**
 * GT-688 — MCP could not express a topology COMPOSITION at all.
 *
 * The handler maps `args` field by field with no spread, and there is no argument
 * validation at dispatch, so anything absent from that list is dropped in
 * silence: `design` was absent, and REST (which accepts `design` as an opaque
 * object) and MCP therefore disagreed about the same request.
 *
 * The assertion that matters is on the MANIFEST the pipeline receives, not on
 * the tool's return — a test that only called `execute()` would pass either way.
 * It lives in its own file because the spy targets the module the tool
 * `await import`s, and `evaluate.tool.spec.ts` loads that module through a
 * different specifier at describe-body time, which silently defeats the spy.
 */

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { EvaluateTool } from './evaluate.tool';

/** Capture every manifest the tool hands the pipeline, and short-circuit the run. */
function captureManifests(): { seen: any[]; restore: () => void } {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require('@beyondnet/evolith-core-domain/application/use-cases/validate-satellite.use-case');
  const seen: any[] = [];
  const spy = jest
    .spyOn(mod.ValidateSatelliteUseCase.prototype, 'execute')
    .mockImplementation(async (input: any) => {
      seen.push(input.manifest);
      return {
        evaluationVerdict: {
          overallVerdict: 'PASS',
          resolvedTopology: input.manifest?.topology ?? null,
          gates: [],
          summary: { totalGates: 0, passedGates: 0, totalEvaluations: 0, passedEvaluations: 0 },
          evaluatedAt: '2026-08-14T00:00:00.000Z',
        },
      };
    });
  return { seen, restore: () => spy.mockRestore() };
}

describe('EvaluateTool · the confirmed composition survives the MCP boundary (GT-688)', () => {
  let workspace: string;

  beforeEach(() => {
    workspace = mkdtempSync(join(tmpdir(), 'evolith-gt688-mcp-'));
  });

  afterEach(() => {
    jest.restoreAllMocks();
    rmSync(workspace, { recursive: true, force: true });
  });

  it('threads design.topologyConfirmedRefs into manifest.topologies', async () => {
    const { seen, restore } = captureManifests();
    try {
      await new EvaluateTool({} as any, {} as any).execute({
        workspaceRef: workspace,
        design: { topologyConfirmedRefs: ['modular-monolith', 'agentic-ai'] },
      });

      expect(seen).toHaveLength(1);
      expect(seen[0].topologies).toEqual(['modular-monolith', 'agentic-ai']);
      // The scalar display field is the composition's PRIMARY member.
      expect(seen[0].topology).toBe('modular-monolith');
      // …and it reaches the OPA input facts, which is what a policy discriminates on.
      expect(seen[0].facts?.context?.topologyConfirmedRefs).toEqual([
        'modular-monolith',
        'agentic-ai',
      ]);
    } finally {
      restore();
    }
  });

  it('a scalar topologyRef still yields the single-element composition', async () => {
    const { seen, restore } = captureManifests();
    try {
      await new EvaluateTool({} as any, {} as any).execute({
        workspaceRef: workspace,
        topologyRef: 'serverless',
      });

      expect(seen).toHaveLength(1);
      expect(seen[0].topology).toBe('serverless');
      expect(seen[0].topologies).toEqual(['serverless']);
    } finally {
      restore();
    }
  });

  it('declares no composition when the caller declares no topology', async () => {
    const { seen, restore } = captureManifests();
    try {
      await new EvaluateTool({} as any, {} as any).execute({ workspaceRef: workspace });

      expect(seen).toHaveLength(1);
      expect(seen[0].topologies).toBeUndefined();
      expect(seen[0].topology).toBeUndefined();
    } finally {
      restore();
    }
  });
});
