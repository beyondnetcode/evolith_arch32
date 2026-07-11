import {
  ExternalTriggerInteractionAdapter,
  HermesChatBoxInteractionAdapter,
  SmartCliChatInteractionAdapter,
  SmartCliCommandInteractionAdapter,
} from '../adapters';
import type { InteractionAdapterPort } from '../domain/ports';

describe('InteractionAdapterPort implementations', () => {
  it('formalizes Evolith CLI command input as smart_cli_command', () => {
    const adapter: InteractionAdapterPort = new SmartCliCommandInteractionAdapter();
    const request = adapter.toRuntimeRequest({ intent: 'validate_gate', source_interface: 'mcp' });

    expect(adapter.sourceInterface).toBe('smart_cli_command');
    expect(request.sourceInterface).toBe('smart_cli_command');
    expect(request.context.sourceInterface).toBe('smart_cli_command');
    expect(request.dryRun).toBe(false);
  });

  it('formalizes Evolith CLI chat input as smart_cli_chat with dry-run default', () => {
    const adapter: InteractionAdapterPort = new SmartCliChatInteractionAdapter();
    const request = adapter.toRuntimeRequest({ intent: 'validate_gate' });

    expect(adapter.sourceInterface).toBe('smart_cli_chat');
    expect(request.sourceInterface).toBe('smart_cli_chat');
    expect(request.context.sourceInterface).toBe('smart_cli_chat');
    expect(request.dryRun).toBe(true);
  });

  it('formalizes Hermes chat box messages without shell execution semantics', () => {
    const adapter: InteractionAdapterPort = new HermesChatBoxInteractionAdapter();
    const request = adapter.toRuntimeRequest({
      message: 'validate_gate',
      conversationId: 'conv-1',
      actor: { id: 'user-1' },
      context: { tenantId: 'tenant-1', phase: 'discovery' },
    });

    expect(adapter.sourceInterface).toBe('hermes_agent_chatbox');
    expect(request.intent).toBe('validate_gate');
    expect(request.context.sourceInterface).toBe('hermes_agent_chatbox');
    expect(request.context.correlationId).toBe('conv-1');
    expect(request.context.requestedBy).toBe('user-1');
    expect(request.dryRun).toBe(true);
  });

  it('formalizes HTTP/API entry as external_trigger and prevents source spoofing', () => {
    const adapter: InteractionAdapterPort = new ExternalTriggerInteractionAdapter();
    const request = adapter.toRuntimeRequest({
      intent: 'validate_gate',
      source_interface: 'mcp',
      correlation_id: 'corr-1',
    });

    expect(adapter.sourceInterface).toBe('external_trigger');
    expect(request.sourceInterface).toBe('external_trigger');
    expect(request.context.sourceInterface).toBe('external_trigger');
    expect(request.context.correlationId).toBe('corr-1');
  });
});
