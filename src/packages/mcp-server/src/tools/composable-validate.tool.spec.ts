import { ComposableValidateTool } from './composable-validate.tool';

// The tool lazily `await import(...)`s the composable engine and each validation
// mode from `@beyondnet/evolith-core-domain`. We replace those subpath modules
// with lightweight doubles so the test stays hermetic (no real validation, no
// disk, no network) and we can assert on the context the engine receives.
const mockRegisterMode = jest.fn();
const mockEngineExecute = jest.fn();

jest.mock(
  '@beyondnet/evolith-core-domain/application/validators/modes/composable-validation-engine',
  () => ({
    ComposableValidationEngine: jest.fn().mockImplementation(() => ({
      registerMode: mockRegisterMode,
      execute: mockEngineExecute,
    })),
  }),
);
jest.mock(
  '@beyondnet/evolith-core-domain/application/validators/modes/sdlc-validation.mode',
  () => ({ SdlcValidationMode: jest.fn() }),
);
jest.mock(
  '@beyondnet/evolith-core-domain/application/validators/modes/architecture-validation.mode',
  () => ({ ArchitectureValidationMode: jest.fn() }),
);
jest.mock(
  '@beyondnet/evolith-core-domain/application/validators/modes/ruleset-validation.mode',
  () => ({ RulesetValidationMode: jest.fn() }),
);
jest.mock(
  '@beyondnet/evolith-core-domain/application/validators/modes/adr-validation.mode',
  () => ({ AdrValidationMode: jest.fn() }),
);
jest.mock(
  '@beyondnet/evolith-core-domain/application/validators/modes/adhoc-validation.mode',
  () => ({ AdhocValidationMode: jest.fn() }),
);

describe('ComposableValidateTool', () => {
  let tool: ComposableValidateTool;

  beforeEach(() => {
    jest.clearAllMocks();
    tool = new ComposableValidateTool();
    mockEngineExecute.mockResolvedValue({ status: 'passed', issues: [] });
  });

  it('exposes the evolith-composable-validate schema with path required', () => {
    expect(tool.schema.name).toBe('evolith-composable-validate');
    expect(tool.schema.inputSchema.type).toBe('object');
    expect(tool.schema.inputSchema.required).toEqual(['path']);
  });

  it('throws when path is missing', async () => {
    await expect(tool.execute({})).rejects.toThrow('path is required');
    // Engine must never be exercised on the guard-clause path.
    expect(mockEngineExecute).not.toHaveBeenCalled();
  });

  it('registers all five validation modes and defaults the engine to native', async () => {
    const result = (await tool.execute({ path: '/repo' })) as Record<string, unknown>;

    // One engine, five modes registered.
    expect(mockRegisterMode).toHaveBeenCalledTimes(5);

    // Context is assembled from the args with sensible defaults.
    expect(mockEngineExecute).toHaveBeenCalledWith({
      satellitePath: '/repo',
      corePath: undefined,
      engine: 'native',
      topology: undefined,
      phase: undefined,
      rulesetId: undefined,
      adrId: undefined,
      filePath: undefined,
    });

    expect(result.tool).toBe('evolith-composable-validate');
    expect(result.type).toBe('composable');
    expect(result.status).toBe('passed');
    expect(result.issues).toEqual([]);
    expect(typeof result.timestamp).toBe('string');
    // ISO-8601 timestamp shape.
    expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('maps every optional arg into the engine context and honours engine=opa', async () => {
    mockEngineExecute.mockResolvedValue({ status: 'failed', issues: [{ ruleId: 'X' }] });

    const result = (await tool.execute({
      path: '/sat',
      corePath: '/core',
      engine: 'opa',
      topology: 'microservices',
      phase: 'design',
      ruleset: 'compliance-baseline',
      adr: 'adr-0002',
      file: 'src/main.ts',
    })) as Record<string, unknown>;

    expect(mockEngineExecute).toHaveBeenCalledWith({
      satellitePath: '/sat',
      corePath: '/core',
      engine: 'opa',
      topology: 'microservices',
      phase: 'design',
      rulesetId: 'compliance-baseline',
      adrId: 'adr-0002',
      filePath: 'src/main.ts',
    });

    // The engine result is spread into the returned envelope.
    expect(result.status).toBe('failed');
    expect(result.issues).toEqual([{ ruleId: 'X' }]);
    expect(result.type).toBe('composable');
  });

  it('propagates errors thrown by the underlying engine', async () => {
    mockEngineExecute.mockRejectedValue(new Error('engine boom'));
    await expect(tool.execute({ path: '/repo' })).rejects.toThrow('engine boom');
  });
});
