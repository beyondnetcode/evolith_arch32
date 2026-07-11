import { randomUUID } from 'node:crypto';
import { ErrorCode, ErrorCodes, DomainException } from './errors';

/**
 * Output envelopes for the MCP Gateway.
 *
 * Every tool result is wrapped in a {@link SuccessEnvelope} or
 * {@link ErrorEnvelope} before being serialized into the MCP `text` content.
 * This gives agents a stable, self-describing contract independent of each
 * tool's payload shape.
 */

/**
 * Pinned version of the MCP envelope shape. Bumped on a breaking change
 * to the envelope (NOT on payload schema changes). A bump requires a new
 * entry in `surface-compatibility.json` per GT-174.
 */
export const MCP_ENVELOPE_SCHEMA_VERSION = '1.0.0';

export interface EnvelopeMeta {
  correlationId: string;
  /** ADR-0073 canonical name for the invoked operation (mirrors `tool`). */
  command: string;
  /** MCP-native alias for `command`; retained for backward compatibility. */
  tool: string;
  durationMs: number;
  /** ADR-0073 canonical timestamp (mirrors `timestamp`). */
  executedAt: string;
  /** MCP-native alias for `executedAt`; retained for backward compatibility. */
  timestamp: string;
  context?: {
    initiative?: string;
    tenant?: string;
    phase?: string;
  };
  /** ADR-0073 envelope shape version, pinned per surface. */
  schemaVersion: string;
}

export interface SuccessEnvelope<T = unknown> {
  success: true;
  data: T;
  meta: EnvelopeMeta;
}

export interface ErrorEnvelope {
  success: false;
  error: {
    code: ErrorCode;
    message: string;
    details?: Record<string, unknown>;
  };
  meta: EnvelopeMeta;
}

export type OutputEnvelope<T = unknown> = SuccessEnvelope<T> | ErrorEnvelope;

/** Generate a correlation id with the Evolith prefix (`evl-...`). */
export function generateCorrelationId(): string {
  return `evl-${randomUUID()}`;
}

export interface MetaInput {
  correlationId: string;
  tool: string;
  durationMs: number;
  /** Injectable for determinism in tests; defaults to the current time. */
  timestamp?: string;
  context?: {
    initiative?: string;
    tenant?: string;
    phase?: string;
  };
}

function buildMeta(meta: MetaInput): EnvelopeMeta {
  const timestamp = meta.timestamp ?? new Date().toISOString();
  return {
    correlationId: meta.correlationId,
    // ADR-0073 canonical keys (command/executedAt) plus their MCP-native
    // aliases (tool/timestamp) so consumers of either shape keep working.
    command: meta.tool,
    tool: meta.tool,
    durationMs: meta.durationMs,
    executedAt: timestamp,
    timestamp,
    context: meta.context,
    schemaVersion: MCP_ENVELOPE_SCHEMA_VERSION,
  };
}

export function success<T>(data: T, meta: MetaInput): SuccessEnvelope<T> {
  return { success: true, data, meta: buildMeta(meta) };
}

export function failure(
  code: ErrorCode,
  message: string,
  meta: MetaInput,
  details?: Record<string, unknown>,
): ErrorEnvelope {
  return {
    success: false,
    error: details ? { code, message, details } : { code, message },
    meta: buildMeta(meta),
  };
}

/**
 * Map an arbitrary thrown value to an {@link ErrorEnvelope}. {@link DomainException}
 * preserves its code and details; anything else collapses to `INTERNAL_ERROR`.
 */
export function toErrorEnvelope(err: unknown, meta: MetaInput): ErrorEnvelope {
  if (err instanceof DomainException) {
    return failure(err.code, err.message, meta, err.details);
  }
  const message = err instanceof Error ? err.message : String(err);
  return failure(ErrorCodes.INTERNAL_ERROR, message, meta);
}
