import { AgentRuntimeFactory } from './agent-runtime.factory';

describe('AgentRuntimeFactory Smart CLI interaction gateway', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    // Reset the cached runtime between tests
    (AgentRuntimeFactory as any).cachedRuntime = null;
    delete process.env.AGENT_RUNTIME_CORE_ENDPOINT;
    delete process.env.AGENT_RUNTIME_CORE_TOKEN;
    delete process.env.AGENT_RUNTIME_HARNESS_ROOT;
  });

  it('routes command mode through SmartCliCommandInteractionAdapter before runtime.handle', async () => {
    const request = { intent: 'validate_gate', sourceInterface: 'smart_cli_command' };
    const adapter = { toRuntimeRequest: jest.fn().mockReturnValue(request) };
    const runtime = { handle: jest.fn().mockResolvedValue({ status: 'passed' }) };

    jest.spyOn(AgentRuntimeFactory, 'createCommandAdapter').mockReturnValue(adapter as never);
    jest.spyOn(AgentRuntimeFactory, 'createDefaultRuntime').mockReturnValue(runtime as never);

    const result = await AgentRuntimeFactory.executeCommand({
      intent: 'validate_gate',
      source_interface: 'mcp',
    });

    expect(adapter.toRuntimeRequest).toHaveBeenCalledWith({
      intent: 'validate_gate',
      source_interface: 'mcp',
    });
    expect(runtime.handle).toHaveBeenCalledWith(request);
    expect(result.status).toBe('passed');
  });

  it('routes chat mode through SmartCliChatInteractionAdapter before runtime.handle', async () => {
    const request = { intent: 'hello', sourceInterface: 'smart_cli_chat', dryRun: true };
    const adapter = { toRuntimeRequest: jest.fn().mockReturnValue(request) };
    const runtime = { handle: jest.fn().mockResolvedValue({ status: 'warning' }) };

    jest.spyOn(AgentRuntimeFactory, 'createChatAdapter').mockReturnValue(adapter as never);
    jest.spyOn(AgentRuntimeFactory, 'createDefaultRuntime').mockReturnValue(runtime as never);

    const result = await AgentRuntimeFactory.executeChat({ intent: 'hello' });

    expect(adapter.toRuntimeRequest).toHaveBeenCalledWith({ intent: 'hello' });
    expect(runtime.handle).toHaveBeenCalledWith(request);
    expect(result.status).toBe('warning');
  });

  it('GT-399: creates runtime via createAgentRuntime bootstrap (not hardcoded stubs)', () => {
    // With no env vars set, createDefaultRuntime should produce a working runtime
    // (using default stubs from the bootstrap). The key assertion is that it does
    // NOT throw and returns an object with a handle method.
    const runtime = AgentRuntimeFactory.createDefaultRuntime();
    expect(runtime).toBeDefined();
    expect(typeof runtime.handle).toBe('function');
  });

  it('GT-399: caches the runtime singleton across calls', () => {
    const r1 = AgentRuntimeFactory.createDefaultRuntime();
    const r2 = AgentRuntimeFactory.createDefaultRuntime();
    expect(r1).toBe(r2);
  });
});
