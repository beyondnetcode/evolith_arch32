import { AjvJsonSchemaValidator } from '@modelcontextprotocol/sdk/validation/ajv.js';
import { Test } from '@nestjs/testing';
import { AppModule } from '../app.module';
import { ToolRegistryService } from './tool-registry.service';
import { ToolDispatchService } from './mcp-tool-dispatch';
import { MetricsService } from './metrics.service';
import { AbacEvaluator } from './abac-evaluator';
import { McpTool } from './tool.interface';
import { Logger } from '@nestjs/common';
import { trace } from '@opentelemetry/api';
import { mcpContextStorage } from './mcp-user-context';
import { buildToolOutputSchema, deriveToolAnnotations, JSON_SCHEMA_DIALECT } from '../common/tool-output-schema';
import { MCP_ENVELOPE_SCHEMA_VERSION } from '../common/envelopes';
import { ErrorCodes } from '../common/errors';

/**
 * GT-581 — every tool declares an output contract, returns `structuredContent`
 * that validates against it, carries behavioural annotations, and `tools/list`
 * answers in a deterministic order.
 *
 * Before this change `McpToolSchema` was `{ name, description, inputSchema }`,
 * every result was a single `text` block, and `tools/list` answered in DI
 * registration order.
 *
 * Validation deliberately uses the SDK's OWN `AjvJsonSchemaValidator` — the exact
 * component `Client.callTool` applies to `structuredContent` when a tool declares
 * an `outputSchema` (`client/index.js:549`). If these assertions pass, a real MCP
 * client accepts our results; a private validator could only prove that our
 * schema agrees with itself.
 */

const validator = new AjvJsonSchemaValidator();
/** Compile `schema` and report whether `value` satisfies it. */
const validates = (schema: unknown, value: unknown): boolean =>
  validator.getValidator(schema as never)(value).valid;

function tool(name: string, opts: Partial<McpTool> = {}): McpTool {
  return {
    schema: { name, description: `desc ${name}`, inputSchema: { type: 'object', properties: {} } },
    execute: async () => ({ verdict: 'PASS' }),
    ...opts,
  } as McpTool;
}

function dispatchOver(tools: McpTool[]): { dispatch: ToolDispatchService; registry: ToolRegistryService } {
  const registry = new ToolRegistryService(tools);
  class AllowAll extends AbacEvaluator {
    override async evaluateOpa() {
      return { allowed: true, violations: [] };
    }
  }
  const dispatch = new ToolDispatchService(
    registry,
    new MetricsService(),
    new AllowAll(),
    new Logger('test'),
    trace.getTracer('test'),
  );
  return { dispatch, registry };
}

const ARCHITECT = {
  id: 'arch-1',
  role: 'architect',
  roles: ['architect'],
  tenant: 'evolith',
  environment: 'production',
  scopes: ['read', 'write'],
};

describe('GT-581 — the generated output schema', () => {
  it('is a JSON Schema 2020-12 object schema, as tools/list requires', () => {
    const schema = buildToolOutputSchema();
    expect(schema.$schema).toBe(JSON_SCHEMA_DIALECT);
    expect(schema.type).toBe('object');
    expect(schema.required).toEqual(['success', 'meta']);
  });

  it('is derived from the envelope sources, not hand-written', () => {
    const schema = buildToolOutputSchema() as Record<string, any>;
    // The pinned envelope version and the error-code enum both come from code,
    // so bumping either cannot leave a stale copy behind in a tool file.
    expect(schema.properties.meta.properties.schemaVersion.const).toBe(MCP_ENVELOPE_SCHEMA_VERSION);
    expect(schema.properties.error.properties.code.enum).toEqual(Object.values(ErrorCodes));
  });

  it('accepts a success envelope and a failure envelope, and rejects a bare payload', () => {
    const schema = buildToolOutputSchema();
    const validate = (value: unknown) => validates(schema, value);
    const meta = {
      correlationId: 'evl-1',
      command: 'evolith-evaluate',
      tool: 'evolith-evaluate',
      durationMs: 3,
      executedAt: '2026-07-28T00:00:00.000Z',
      timestamp: '2026-07-28T00:00:00.000Z',
      schemaVersion: MCP_ENVELOPE_SCHEMA_VERSION,
    };
    expect(validate({ success: true, data: { verdict: 'FAIL' }, meta })).toBe(true);
    expect(validate({ success: false, error: { code: ErrorCodes.FORBIDDEN, message: 'no' }, meta })).toBe(true);
    // success:false without an error block is not a valid envelope
    expect(validate({ success: false, meta })).toBe(false);
    // and the payload alone — what a consumer used to have to reconstruct — is not
    expect(validate({ verdict: 'FAIL' })).toBe(false);
  });

  it('lets a tool narrow `data` without restating the envelope', () => {
    const schema = buildToolOutputSchema({ type: 'object', required: ['verdict'] });
    const validate = (value: unknown) => validates(schema, value);
    const meta = {
      correlationId: 'evl-1', command: 'c', tool: 'c', durationMs: 1,
      executedAt: '2026-07-28T00:00:00.000Z', timestamp: '2026-07-28T00:00:00.000Z',
      schemaVersion: MCP_ENVELOPE_SCHEMA_VERSION,
    };
    expect(validate({ success: true, data: { verdict: 'PASS' }, meta })).toBe(true);
    expect(validate({ success: true, data: { nope: 1 }, meta })).toBe(false);
  });
});

describe('GT-581 — derived annotations', () => {
  it('marks a non-mutating read tool read-only and non-destructive', () => {
    expect(deriveToolAnnotations({ scope: 'read' })).toMatchObject({
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
    });
  });

  it('marks a mutative tool destructive and not read-only', () => {
    expect(deriveToolAnnotations({ mutative: true })).toMatchObject({
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: false,
    });
  });

  it('lets a tool override the derived hints', () => {
    expect(deriveToolAnnotations({ mutative: true, annotations: { idempotentHint: true } }))
      .toMatchObject({ destructiveHint: true, idempotentHint: true });
  });
});

describe('GT-581 — the wire contract of tools/list', () => {
  it('returns tools in a deterministic (lexicographic) order regardless of registration order', () => {
    const names = ['evolith-zulu', 'evolith-alpha', 'evolith-mike'];
    const forward = dispatchOver(names.map((n) => tool(n))).dispatch.listTools().tools.map((t) => t.name);
    const reversed = dispatchOver([...names].reverse().map((n) => tool(n))).dispatch.listTools().tools.map((t) => t.name);

    expect(forward).toEqual(['evolith-alpha', 'evolith-mike', 'evolith-zulu']);
    expect(forward).toEqual(reversed);
  });

  it('stamps an outputSchema and annotations onto every advertised tool', () => {
    const { dispatch } = dispatchOver([
      tool('evolith-adr-list', { scope: 'read' }),
      tool('evolith-satellite-create', { mutative: true, scope: 'write' }),
    ]);
    const listed = dispatch.listTools().tools;

    for (const schema of listed) {
      expect(schema.outputSchema?.type).toBe('object');
      expect(schema.annotations).toBeDefined();
    }
    // …and a client can tell the read tool from the destructive one BEFORE calling
    const byName = Object.fromEntries(listed.map((s) => [s.name, s]));
    expect(byName['evolith-adr-list'].annotations).toMatchObject({ readOnlyHint: true, destructiveHint: false });
    expect(byName['evolith-satellite-create'].annotations).toMatchObject({ readOnlyHint: false, destructiveHint: true });
  });
});

describe('GT-581 — structuredContent is returned and validates against the declared schema', () => {
  it('validates a successful result against the tool\'s own advertised outputSchema', async () => {
    const { dispatch } = dispatchOver([tool('evolith-evaluate', { scope: 'read' })]);
    const advertised = dispatch.listTools().tools[0];

    const result = await mcpContextStorage.run(ARCHITECT, () => dispatch.callTool('evolith-evaluate', {}));

    expect(result.structuredContent).toBeDefined();
    // The verdict is reachable as data, not by regexing prose.
    expect((result.structuredContent as any).data.verdict).toBe('PASS');
    const outcome = validator.getValidator(advertised.outputSchema as never)(result.structuredContent);
    expect(outcome.errorMessage).toBeUndefined();
    expect(outcome.valid).toBe(true);
  });

  it('validates a FORBIDDEN denial too — the result a caller most needs to read mechanically', async () => {
    const { dispatch } = dispatchOver([tool('evolith-evaluate', { scope: 'read' })]);
    const advertised = dispatch.listTools().tools[0];

    // No principal → anonymous → ABAC-02 → FORBIDDEN envelope.
    const result = await dispatch.callTool('evolith-evaluate', {});

    expect(result.isError).toBe(true);
    expect((result.structuredContent as any).error.code).toBe(ErrorCodes.FORBIDDEN);
    expect(validates(advertised.outputSchema, result.structuredContent)).toBe(true);
  });

  it('mirrors the text block exactly (no second, divergent serialization)', async () => {
    const { dispatch } = dispatchOver([tool('evolith-evaluate', { scope: 'read' })]);
    const result = await mcpContextStorage.run(ARCHITECT, () => dispatch.callTool('evolith-evaluate', {}));
    expect(JSON.parse(result.content[0].text)).toEqual(result.structuredContent);
  });
});

describe('GT-581 — the full registered surface (DI graph)', () => {
  let registry: ToolRegistryService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    registry = moduleRef.get(ToolRegistryService);
  });

  it('declares a valid outputSchema and annotations for EVERY registered tool', () => {
    const schemas = registry.listSchemas();
    expect(schemas.length).toBeGreaterThan(0);

    const offenders = schemas.filter(
      (s) => !s.outputSchema || s.outputSchema.type !== 'object' || !s.annotations,
    );
    expect(offenders.map((s) => s.name)).toEqual([]);

    // Every advertised schema must actually compile under the SDK's validator.
    for (const s of schemas) expect(() => validator.getValidator(s.outputSchema as never)).not.toThrow();
  });

  it('advertises the whole surface in lexicographic order', () => {
    const names = registry.listSchemas().map((s) => s.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, 'en')));
  });
});
