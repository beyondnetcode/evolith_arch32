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

export interface EnvelopeMeta {
  correlationId: string;
  tool: string;
  durationMs: number;
  timestamp: string;
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
}

function buildMeta(meta: MetaInput): EnvelopeMeta {
  return {
    correlationId: meta.correlationId,
    tool: meta.tool,
    durationMs: meta.durationMs,
    timestamp: meta.timestamp ?? new Date().toISOString(),
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
