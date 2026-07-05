import { loadDefaultWorkflow, DefaultWorkflowDefinition } from './default-workflow-definition';

describe('loadDefaultWorkflow (GT-344 — never crash without on-disk rulesets)', () => {
  const original = process.env.WORKSPACE_ROOT;

  afterEach(() => {
    if (original === undefined) delete process.env.WORKSPACE_ROOT;
    else process.env.WORKSPACE_ROOT = original;
  });

  it('falls back to the embedded default when no ruleset file resolves', () => {
    // Force both on-disk candidates to miss: a bogus WORKSPACE_ROOT plus the
    // __dirname fallback (packages/core-domain/rulesets) which is not shipped.
    process.env.WORKSPACE_ROOT = '/nonexistent-evolith-workspace-xyz';

    let workflow: DefaultWorkflowDefinition | undefined;
    expect(() => {
      workflow = loadDefaultWorkflow();
    }).not.toThrow();

    expect(workflow).toBeInstanceOf(DefaultWorkflowDefinition);
    expect(workflow!.name).toBe('evolith-default');
    expect(workflow!.getAllPhases()).toHaveLength(6);
    expect(workflow!.isValidPhase('phase-0')).toBe(true);
    expect(workflow!.canTransition('phase-0', 'phase-1')).toBe(true);
  });

  it('is consumed by PhaseService construction without throwing in a clean env', async () => {
    process.env.WORKSPACE_ROOT = '/nonexistent-evolith-workspace-xyz';
    const { PhaseService } = await import('./index');
    expect(() => new PhaseService()).not.toThrow();
  });
});
