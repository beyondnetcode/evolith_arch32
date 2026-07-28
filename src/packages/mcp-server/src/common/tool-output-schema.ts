import { ErrorCodes } from './errors';
import { MCP_ENVELOPE_SCHEMA_VERSION } from './envelopes';

/**
 * GT-581 — the machine-readable output contract of every MCP tool.
 *
 * Until this module existed, `McpToolSchema` was `{ name, description,
 * inputSchema }` and every tool answered with a single `text` block. A consumer
 * that wanted the verdict of `evolith-evaluate` — which IS a structured object —
 * had to `JSON.parse` prose it was told nothing about, or regex it. That is the
 * ADR-0073 surface-parity claim failing in the direction that matters most: the
 * same operation is typed over REST and untyped over MCP.
 *
 * The contract is **derived, never hand-written per tool**. Every tool result is
 * wrapped by `success()` / `failure()` in `envelopes.ts`, so the envelope — whose
 * shape is pinned by {@link MCP_ENVELOPE_SCHEMA_VERSION} and whose error codes
 * are enumerated by {@link ErrorCodes} — is the one contract that holds for all
 * fifty tools. {@link buildToolOutputSchema} generates it from those two sources,
 * and {@link ToolRegistryService} applies it to every registered tool. Adding a
 * tool therefore cannot forget to declare an output contract, and bumping the
 * envelope version cannot leave a stale copy behind in a tool file.
 *
 * A tool MAY narrow the `data` branch by declaring `outputDataSchema`; it never
 * restates the envelope. Narrowing every tool's `data` from the shared operation
 * registry is GT-583's job (`inputSchema`/`outputSchema` per operation in the
 * capability manifest) and is deliberately not duplicated here.
 */

/** JSON Schema 2020-12 object, as the MCP `Tool.outputSchema` field requires. */
export interface JsonSchemaObject {
  type: 'object';
  properties?: Record<string, unknown>;
  required?: string[];
  [keyword: string]: unknown;
}

/** Meta-schema the MCP specification expects for tool schemas (SEP-2106). */
export const JSON_SCHEMA_DIALECT = 'https://json-schema.org/draft/2020-12/schema';

/** `meta` block of the envelope — identical for every tool. */
const ENVELOPE_META_SCHEMA = {
  type: 'object',
  description: 'ADR-0073 envelope metadata. Identical across the CLI, REST and MCP surfaces.',
  properties: {
    correlationId: { type: 'string', description: "Correlation id, prefixed 'evl-'." },
    command: { type: 'string', description: 'ADR-0073 canonical name of the invoked operation.' },
    tool: { type: 'string', description: 'MCP-native alias of `command`.' },
    durationMs: { type: 'number', description: 'Server-side wall time of the call.' },
    executedAt: { type: 'string', format: 'date-time', description: 'ADR-0073 canonical timestamp.' },
    timestamp: { type: 'string', format: 'date-time', description: 'MCP-native alias of `executedAt`.' },
    schemaVersion: {
      type: 'string',
      const: MCP_ENVELOPE_SCHEMA_VERSION,
      description: 'Pinned envelope shape version. Bumped only on a breaking envelope change.',
    },
    context: {
      type: 'object',
      description: 'Verbatim echo of the caller-supplied execution context.',
      properties: {
        initiative: { type: 'string' },
        tenant: { type: 'string' },
        phase: { type: 'string' },
      },
    },
  },
  required: ['correlationId', 'command', 'tool', 'durationMs', 'executedAt', 'timestamp', 'schemaVersion'],
} as const;

/** `error` block — its `code` enum is generated from {@link ErrorCodes}. */
const ENVELOPE_ERROR_SCHEMA = {
  type: 'object',
  description: 'Present when `success` is false. `code` is machine-readable and append-only.',
  properties: {
    code: {
      type: 'string',
      enum: Object.values(ErrorCodes),
      description: 'Stable Evolith error code. FORBIDDEN covers every ABAC / scope / approval refusal.',
    },
    message: { type: 'string' },
    details: { type: 'object' },
  },
  required: ['code', 'message'],
} as const;

/** Default `data` schema: unconstrained, but explicitly declared as such. */
const UNCONSTRAINED_DATA_SCHEMA = {
  description:
    'Tool-specific payload, present when `success` is true. Not narrowed for this tool yet — '
    + 'per-operation payload schemas are generated from the capability manifest (GT-583).',
} as const;

/**
 * Build the output schema for one tool.
 *
 * @param dataSchema optional narrowing of the `data` branch. Omit to declare the
 *   payload unconstrained rather than undeclared — a consumer can still rely on
 *   the envelope, which is the part it used to have to guess.
 */
export function buildToolOutputSchema(dataSchema?: Record<string, unknown>): JsonSchemaObject {
  return {
    $schema: JSON_SCHEMA_DIALECT,
    type: 'object',
    title: 'EvolithMcpOutputEnvelope',
    description:
      'Envelope returned by every Evolith MCP tool, mirrored verbatim in `structuredContent`. '
      + '`success: true` carries `data`; `success: false` carries `error`. '
      + `Envelope schema version ${MCP_ENVELOPE_SCHEMA_VERSION}.`,
    properties: {
      success: { type: 'boolean', description: 'Whether the operation completed. Not the governance verdict.' },
      data: dataSchema ?? UNCONSTRAINED_DATA_SCHEMA,
      error: ENVELOPE_ERROR_SCHEMA,
      meta: ENVELOPE_META_SCHEMA,
    },
    required: ['success', 'meta'],
    additionalProperties: false,
    // `data` is deliberately NOT required on the success branch: a tool that
    // resolves `undefined` produces an envelope whose `data` key disappears in
    // JSON. The error branch has no such escape, so it is constrained.
    allOf: [
      {
        if: { type: 'object', properties: { success: { const: false } }, required: ['success'] },
        then: { required: ['error'] },
      },
    ],
  };
}

/**
 * MCP tool annotations (`readOnlyHint` / `destructiveHint` / `idempotentHint` /
 * `openWorldHint`), as declared by the SDK's `ToolAnnotationsSchema`.
 */
export interface McpToolAnnotations {
  title?: string;
  readOnlyHint?: boolean;
  destructiveHint?: boolean;
  idempotentHint?: boolean;
  openWorldHint?: boolean;
}

/**
 * Derive the behavioural hints of a tool from the two properties it already
 * declares — `mutative` and `scope` — so a client can tell `evolith-adr-list`
 * from `evolith-satellite-create` BEFORE invoking either.
 *
 * The defaults are the specification's conservative ones: anything that mutates
 * is assumed destructive and non-idempotent unless the tool says otherwise, and
 * a tool that declares its own annotations wins. `openWorldHint` is false: every
 * Evolith tool operates on the local working tree and the compiled rulesets, not
 * on an open-ended external world.
 */
export function deriveToolAnnotations(
  tool: { mutative?: boolean; scope?: 'read' | 'write' | 'admin'; annotations?: McpToolAnnotations },
): McpToolAnnotations {
  const writes = tool.mutative === true || tool.scope === 'write' || tool.scope === 'admin';
  return {
    readOnlyHint: !writes,
    destructiveHint: writes,
    idempotentHint: !writes,
    openWorldHint: false,
    ...(tool.annotations ?? {}),
  };
}
