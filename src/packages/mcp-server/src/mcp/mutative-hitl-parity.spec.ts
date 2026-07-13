import { Test } from '@nestjs/testing';
import { AppModule } from '../app.module';
import { ToolRegistryService } from './tool-registry.service';
import { AbacEvaluator } from './abac-evaluator';

/**
 * GT-475 guard: the HITL/approval gate and the ABAC verb classification must
 * never disagree about whether a tool mutates state.
 *
 * The dispatch (`mcp-tool-dispatch.ts`) enforces the human-in-the-loop approval
 * gate ({ apply:true, approvalToken }) by keying on `tool.mutative` — NOT on the
 * ABAC verb. So a tool that ABAC treats as state-changing (`write`/`deploy`) but
 * that omits `mutative:true` would mutate (e.g. `evolith-satellite-create`
 * provisions a live GitHub repo!) with NO approval. This is exactly the bypass
 * GT-475 records. This suite fails the build if that drift ever reappears.
 *
 * Neither side is hand-listed: the state-changing set is derived from the ABAC
 * evaluator's classification, and the `mutative` flags are read off the live
 * DI-registered tool surface — the two sources of truth are checked against each
 * other, not against a fixture, so a new write-class tool that forgets its
 * `mutative` flag (or a mutative tool mis-classified as `read`) is caught here.
 */
describe('mutative <-> ABAC verb parity (HITL gate, GT-475)', () => {
  let registry: ToolRegistryService;
  const abac = new AbacEvaluator();

  /** A verb class that denotes a state change and therefore MUST be HITL-gated. */
  const isStateChanging = (name: string): boolean => {
    const verb = abac.classifyTool(name);
    return verb === 'write' || verb === 'deploy';
  };

  const describeTool = (name: string): string => `${name} (${abac.classifyTool(name) ?? 'unclassified'})`;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    registry = moduleRef.get(ToolRegistryService);
  });

  it('registers at least one write-class tool (guard is not vacuous)', () => {
    const writeClass = registry.list().filter((t) => isStateChanging(t.schema.name));
    expect(writeClass.length).toBeGreaterThan(0);
  });

  it('every ABAC write/deploy tool declares mutative:true (no HITL bypass)', () => {
    const offenders = registry
      .list()
      .filter((tool) => isStateChanging(tool.schema.name))
      .filter((tool) => tool.mutative !== true)
      .map((tool) => describeTool(tool.schema.name));

    // Any offender would slip a state-changing tool past the { apply, approvalToken }
    // gate, since the dispatch keys HITL enforcement on `mutative`.
    expect(offenders).toEqual([]);
  });

  it('every mutative tool is ABAC write/deploy (mutative never masquerades as read)', () => {
    const offenders = registry
      .list()
      .filter((tool) => tool.mutative === true)
      .filter((tool) => !isStateChanging(tool.schema.name))
      .map((tool) => describeTool(tool.schema.name));

    expect(offenders).toEqual([]);
  });

  it('phase-advance is a non-binding read proposal: ABAC read, not mutative (GT-379)', () => {
    const tool = registry.get('evolith-phase-advance');
    expect(tool).toBeDefined();
    expect(abac.classifyTool('evolith-phase-advance')).toBe('read');
    expect(tool?.mutative).toBeFalsy();
  });
});
