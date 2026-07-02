import { RoutingAgentAdapter } from '../adapters/engine/routing-agent.adapter';
import type { IAgentEnginePort, AgentEnginePlan } from '../../domain/ports/agent-engine.port';
import type { AgentRuntimeRequest } from '../../domain/contracts/agent-runtime-request';

describe('RoutingAgentAdapter', () => {
  const requestTemplate: AgentRuntimeRequest = {
    intent: '',
    context: { tenantId: 'tenant-1', productId: 'prod-1', initiativeId: 'init-1', phase: 'build', gate: 'f2' },
  };

  const createMockEngine = (name: string): IAgentEnginePort => ({
    plan: jest.fn().mockResolvedValue({
      engine: name,
      proposedTool: 'test-tool',
      rationale: `Handled by ${name}`,
    } as AgentEnginePlan),
  });

  const stubEngine = createMockEngine('stub');
  const hermesEngine = createMockEngine('hermes');
  const swarmsEngine = createMockEngine('swarms');

  const engines = {
    stub: stubEngine,
    hermes: hermesEngine,
    swarms: swarmsEngine,
  };

  const config = {
    defaultEngine: 'stub',
    routes: [
      { intentMatches: 'complex multi-agent', engine: 'swarms' },
      { intentMatches: 'chat', engine: 'hermes' },
    ],
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('routes to the default engine if no routes match', async () => {
    const router = new RoutingAgentAdapter(config, engines);
    const plan = await router.plan({ ...requestTemplate, intent: 'just do a simple task' }, []);
    
    expect(plan.engine).toBe('stub');
    expect(stubEngine.plan).toHaveBeenCalled();
    expect(hermesEngine.plan).not.toHaveBeenCalled();
    expect(swarmsEngine.plan).not.toHaveBeenCalled();
  });

  it('routes to swarms if intent matches complex multi-agent', async () => {
    const router = new RoutingAgentAdapter(config, engines);
    const plan = await router.plan({ ...requestTemplate, intent: 'run a CoMplex multi-Agent workflow' }, []);
    
    expect(plan.engine).toBe('swarms');
    expect(swarmsEngine.plan).toHaveBeenCalled();
    expect(stubEngine.plan).not.toHaveBeenCalled();
  });

  it('routes to hermes if intent matches chat', async () => {
    const router = new RoutingAgentAdapter(config, engines);
    const plan = await router.plan({ ...requestTemplate, intent: 'let us chat about code' }, []);
    
    expect(plan.engine).toBe('hermes');
    expect(hermesEngine.plan).toHaveBeenCalled();
  });

  it('throws an error if the default engine is missing from the map', () => {
    expect(() => new RoutingAgentAdapter(config, { swarms: swarmsEngine })).toThrow(/is not provided in the engines map/);
  });
});
