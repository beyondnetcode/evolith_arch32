import { McpInteractionAdapter, McpToolInput } from './McpInteractionAdapter';

describe('McpInteractionAdapter (GT-405)', () => {
  let adapter: McpInteractionAdapter;

  beforeEach(() => {
    adapter = new McpInteractionAdapter();
  });

  it('declares sourceInterface as mcp', () => {
    expect(adapter.sourceInterface).toBe('mcp');
  });

  it('maps tool name to intent and tool', () => {
    const input: McpToolInput = {
      toolName: 'evolith-validate',
      args: { path: '/satellite' },
    };

    const result = adapter.toRuntimeRequest(input);

    expect(result.intent).toBe('evolith-validate');
    expect(result.tool).toBe('evolith-validate');
    expect(result.sourceInterface).toBe('mcp');
  });

  it('extracts tenant from top-level args', () => {
    const input: McpToolInput = {
      toolName: 'evolith-validate',
      args: { path: '/satellite', tenant: 'acme' },
    };

    const result = adapter.toRuntimeRequest(input);

    expect(result.context.tenantId).toBe('acme');
  });

  it('extracts tenant from nested context', () => {
    const input: McpToolInput = {
      toolName: 'evolith-validate',
      args: { path: '/satellite', context: { tenant: 'acme' } },
    };

    const result = adapter.toRuntimeRequest(input);

    expect(result.context.tenantId).toBe('acme');
  });

  it('top-level args take precedence over nested context', () => {
    const input: McpToolInput = {
      toolName: 'evolith-validate',
      args: { tenant: 'top-level', context: { tenant: 'nested' } },
    };

    const result = adapter.toRuntimeRequest(input);

    expect(result.context.tenantId).toBe('top-level');
  });

  it('extracts initiative and phase from args', () => {
    const input: McpToolInput = {
      toolName: 'evolith-gate-evaluate',
      args: { initiative: 'init-123', phase: 'f2', gate: 'gate-f2' },
    };

    const result = adapter.toRuntimeRequest(input);

    expect(result.context.initiativeId).toBe('init-123');
    expect(result.context.phase).toBe('f2');
    expect(result.context.gate).toBe('gate-f2');
  });

  it('sets dry_run from args.dry_run or args.dryRun', () => {
    const input1: McpToolInput = {
      toolName: 'evolith-validate',
      args: { dry_run: true },
    };
    const input2: McpToolInput = {
      toolName: 'evolith-validate',
      args: { dryRun: true },
    };

    expect(adapter.toRuntimeRequest(input1).dryRun).toBe(true);
    expect(adapter.toRuntimeRequest(input2).dryRun).toBe(true);
  });

  it('defaults dry_run to false', () => {
    const input: McpToolInput = {
      toolName: 'evolith-validate',
      args: {},
    };

    expect(adapter.toRuntimeRequest(input).dryRun).toBe(false);
  });

  it('passes full args as parameters', () => {
    const input: McpToolInput = {
      toolName: 'evolith-validate',
      args: { path: '/satellite', engine: 'opa', topology: 'modular-monolith' },
    };

    const result = adapter.toRuntimeRequest(input);

    expect(result.parameters).toEqual({ path: '/satellite', engine: 'opa', topology: 'modular-monolith' });
  });

  it('extracts correlation_id from args', () => {
    const input: McpToolInput = {
      toolName: 'evolith-validate',
      args: { correlationId: 'corr-abc-123' },
    };

    const result = adapter.toRuntimeRequest(input);

    expect(result.context.correlationId).toBe('corr-abc-123');
  });

  it('rejects empty intent', () => {
    const input: McpToolInput = {
      toolName: '',
      args: {},
    };

    expect(() => adapter.toRuntimeRequest(input)).toThrow(TypeError);
  });
});
