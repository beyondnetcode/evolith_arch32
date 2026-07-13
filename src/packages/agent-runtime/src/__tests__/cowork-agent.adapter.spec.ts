import { CoworkAgentEngineAdapter, type CoworkClient } from '../adapters/engine/cowork-agent.adapter';
import type { AgentRuntimeRequest } from '../../domain/contracts/agent-runtime-request';
import type { SkillDescriptor } from '../../domain/contracts/capability';

describe('CoworkAgentEngineAdapter (GT-531 — bounded, replaceable governed executor)', () => {
  const skills: SkillDescriptor[] = [
    { id: 'foo', description: 'Does foo', intents: ['foo'], type: 'effect', handler: jest.fn() } as unknown as SkillDescriptor,
    { id: 'bar', description: 'Does bar', intents: ['bar'], type: 'effect', handler: jest.fn() } as unknown as SkillDescriptor,
  ];

  const request: AgentRuntimeRequest = {
    intent: 'do the thing',
    context: { tenantId: 'tenant-1', productId: 'prod-1', initiativeId: 'init-1', phase: 'build', gate: 'f2' },
  };

  it('proposes a tool the Cowork client selected WHEN it is in the governed catalog', async () => {
    const client: CoworkClient = {
      propose: jest.fn().mockResolvedValue({ tool: 'foo', arguments: { a: 1 }, rationale: 'Cowork picked foo.' }),
    };
    const plan = await new CoworkAgentEngineAdapter({ client }).plan(request, skills);
    expect(plan).toEqual({ engine: 'cowork', proposedTool: 'foo', proposedArguments: { a: 1 }, rationale: 'Cowork picked foo.' });
  });

  it('REJECTS a tool outside the catalog — bounded executor never invents a capability', async () => {
    const client: CoworkClient = {
      propose: jest.fn().mockResolvedValue({ tool: 'delete-everything', rationale: 'trust me' }),
    };
    const plan = await new CoworkAgentEngineAdapter({ client }).plan(request, skills);
    expect(plan.proposedTool).toBeUndefined();
    expect(plan.engine).toBe('cowork');
    expect(plan.rationale).toMatch(/not in the governed skill catalog — rejected/);
    expect(plan.recommendations).toEqual(["Try 'foo': Does foo", "Try 'bar': Does bar"]);
  });

  it('is deterministic with NO client wired (no external call), like the stub', async () => {
    const plan = await new CoworkAgentEngineAdapter().plan(request, skills);
    expect(plan.proposedTool).toBeUndefined();
    expect(plan.engine).toBe('cowork');
    expect(plan.recommendations).toHaveLength(2);
  });

  it('treats Cowork as replaceable — same IAgentEnginePort as stub/hermes/swarms', () => {
    const adapter = new CoworkAgentEngineAdapter();
    expect(typeof adapter.plan).toBe('function');
  });
});
