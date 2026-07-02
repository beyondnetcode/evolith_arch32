import { AgentRuntimeFactory } from './agent-runtime.factory';

describe('AgentRuntimeFactory Smart CLI interaction gateway', () => {
  afterEach(() => {
    jest.restoreAllMocks();
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
});
