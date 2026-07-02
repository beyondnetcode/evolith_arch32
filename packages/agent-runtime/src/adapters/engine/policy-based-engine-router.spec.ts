import { PolicyBasedEngineRouter, type RoutingDecision } from './policy-based-engine-router';
import type { IAgentEnginePort, AgentEnginePlan } from '../../domain/ports/agent-engine.port';
import type { AgentRuntimeRequest } from '../../domain/contracts/agent-runtime-request';
import type { SkillDescriptor } from '../../domain/contracts/skill-descriptor';

function createMockEngine(id: string): IAgentEnginePort {
  return {
    plan: jest.fn().mockResolvedValue({
      rationale: `Plan from ${id}`,
      engine: id,
    } as AgentEnginePlan),
  };
}

function createRequest(overrides: Partial<AgentRuntimeRequest> = {}): AgentRuntimeRequest {
  return {
    intent: 'validate_gate',
    context: { sourceInterface: 'smart_cli_command' },
    ...overrides,
  };
}

describe('PolicyBasedEngineRouter (GT-407)', () => {
  const stubEngine = createMockEngine('stub');
  const hermesEngine = createMockEngine('hermes');
  const engines = { stub: stubEngine, hermes: hermesEngine };
  const skills: SkillDescriptor[] = [];

  afterEach(() => jest.clearAllMocks());

  it('routes to stub by default when no risk signals provided', async () => {
    const router = new PolicyBasedEngineRouter(engines, 'stub');
    const result = await router.plan(createRequest(), skills);
    expect(result.engine).toBe('stub');
    expect(stubEngine.plan).toHaveBeenCalled();
  });

  it('routes to hermes for medium risk without privacy concerns', async () => {
    const router = new PolicyBasedEngineRouter(engines, 'stub');
    const request = createRequest({
      parameters: {
        risk_assessment: { criticality: 'medium', security_risks: 'none', complexity: 'simple' },
      },
    });
    const result = await router.plan(request, skills);
    expect(result.engine).toBe('hermes');
    expect(hermesEngine.plan).toHaveBeenCalled();
  });

  it('routes to stub for privacy-sensitive requests', async () => {
    const router = new PolicyBasedEngineRouter(engines, 'stub');
    const request = createRequest({
      parameters: { privacy_classification: 'confidential' },
    });
    const result = await router.plan(request, skills);
    expect(result.engine).toBe('stub');
    expect(stubEngine.plan).toHaveBeenCalled();
  });

  it('routes to stub for critical risk', async () => {
    const router = new PolicyBasedEngineRouter(engines, 'stub');
    const request = createRequest({
      parameters: {
        risk_assessment: { criticality: 'critical', security_risks: 'none', complexity: 'simple' },
      },
    });
    const result = await router.plan(request, skills);
    expect(result.engine).toBe('stub');
  });

  it('routes to stub when cost budget exhausted', async () => {
    const router = new PolicyBasedEngineRouter(engines, 'stub');
    const request = createRequest({
      parameters: { cost_budget: { remaining_tokens: 100 } },
    });
    const result = await router.plan(request, skills);
    expect(result.engine).toBe('stub');
  });

  it('uses custom policy evaluator when provided', async () => {
    const customEvaluator = (ctx: any): RoutingDecision => ({
      engine: 'hermes',
      reason: 'Custom policy override',
    });
    const router = new PolicyBasedEngineRouter(engines, 'stub', customEvaluator);
    const result = await router.plan(createRequest(), skills);
    expect(result.engine).toBe('hermes');
    expect(hermesEngine.plan).toHaveBeenCalled();
  });

  it('falls back to default engine when selected engine not available', async () => {
    const router = new PolicyBasedEngineRouter({ stub: stubEngine }, 'stub');
    const request = createRequest({
      parameters: {
        risk_assessment: { criticality: 'medium', security_risks: 'none', complexity: 'simple' },
      },
    });
    const result = await router.plan(request, skills);
    // Hermes not in engines map, should fall back to stub
    expect(result.engine).toBe('stub');
  });

  it('infers low criticality for dry-run requests', async () => {
    const router = new PolicyBasedEngineRouter(engines, 'stub');
    const request = createRequest({ dryRun: true });
    const result = await router.plan(request, skills);
    expect(result.engine).toBe('stub');
  });

  it('infers medium criticality for MCP source', async () => {
    const router = new PolicyBasedEngineRouter(engines, 'stub');
    const request = createRequest({
      sourceInterface: 'mcp',
    });
    const result = await router.plan(request, skills);
    // MCP source → medium criticality → hermes if available
    expect(result.engine).toBe('hermes');
  });
});
