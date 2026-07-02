import { SwarmsAgentAdapter, type SwarmsClient } from '../adapters/engine/swarms-agent.adapter';
import type { AgentRuntimeRequest } from '../../domain/contracts/agent-runtime-request';
import type { SkillDescriptor } from '../../domain/contracts/capability';

describe('SwarmsAgentAdapter', () => {
  const mockSkills: SkillDescriptor[] = [
    { id: 'foo', description: 'Does foo', intents: ['foo'], type: 'effect', handler: jest.fn() },
    { id: 'bar', description: 'Does bar', intents: ['bar'], type: 'effect', handler: jest.fn() },
  ];

  const request: AgentRuntimeRequest = {
    intent: 'analyze and fix',
    context: {
      tenantId: 'tenant-1',
      productId: 'prod-1',
      initiativeId: 'init-1',
      phase: 'build',
      gate: 'f2',
    },
    parameters: { key: 'value' },
  };

  it('delegates to the injected Swarms client and formats the rationale', async () => {
    const mockClient: SwarmsClient = {
      orchestrate: jest.fn().mockResolvedValue({
        selectedTool: 'foo',
        arguments: { arg1: 'val1' },
        rationale: 'Analysis complete, deploying fix.',
        agentsInvolved: ['Router', 'Analyst', 'Coder'],
      }),
    };

    const adapter = new SwarmsAgentAdapter({ client: mockClient });
    const plan = await adapter.plan(request, mockSkills);

    expect(mockClient.orchestrate).toHaveBeenCalledWith({
      goal: 'analyze and fix',
      context: expect.objectContaining({ tenant: 'tenant-1', parameters: { key: 'value' } }),
      availableTools: [
        { id: 'foo', description: 'Does foo' },
        { id: 'bar', description: 'Does bar' },
      ],
    });

    expect(plan).toEqual({
      engine: 'swarms',
      proposedTool: 'foo',
      proposedArguments: { arg1: 'val1' },
      rationale: '[Swarms Orchestration via Router, Analyst, Coder] Analysis complete, deploying fix.',
    });
  });

  it('throws an actionable error if the lazy-loaded module is not found', async () => {
    const adapter = new SwarmsAgentAdapter({ moduleName: 'non-existent-swarms-module' });
    await expect(adapter.plan(request, mockSkills)).rejects.toThrow(
      /Swarms engine is not available .* Install\/configure 'non-existent-swarms-module'/,
    );
  });
});
