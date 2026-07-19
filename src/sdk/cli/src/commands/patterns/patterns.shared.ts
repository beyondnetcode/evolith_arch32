import { randomUUID } from 'node:crypto';
import {
  createErrorEnvelope,
  createSuccessEnvelope,
  OUTPUT_ENVELOPE_SCHEMA_VERSION,
  type ErrorCode,
} from '@beyondnet/evolith-core-domain/domain/gate-evidence';
import type {
  PatternCategory,
  PatternKind,
} from '@beyondnet/evolith-core-domain/application/services';

/**
 * Shared plumbing for the `evolith patterns` subcommands (GT-563).
 *
 * Kept in one place so `list`, `get` and `for-topology` cannot drift apart on the
 * two things a machine consumer depends on: a SINGLE ADR-0073 envelope on stdout,
 * and a failure that is an ERROR envelope with a non-zero exit code — never a
 * success envelope carrying a failure in its payload (the bug fixed in 3ca7acf5).
 */

/** Values accepted by `--category`, mirroring `pattern.schema.json`. */
export const PATTERN_CATEGORIES: readonly PatternCategory[] = [
  'data-ownership',
  'contracts',
  'resilience',
  'integration',
  'governance',
  'structure',
  'observability',
  'security',
  'ai-safety',
  'delivery',
];

/** Values accepted by `--kind`. */
export const PATTERN_KINDS: readonly PatternKind[] = ['pattern', 'anti-pattern'];

export interface EnvelopeMeta {
  command: string;
  executedAt: string;
  durationMs: number;
  correlationId: string;
  schemaVersion: string;
}

export function buildMeta(command: string): EnvelopeMeta {
  return {
    command,
    executedAt: new Date().toISOString(),
    durationMs: 0,
    correlationId: randomUUID(),
    schemaVersion: OUTPUT_ENVELOPE_SCHEMA_VERSION,
  };
}

/** Emits the sole success envelope on stdout. */
export function emitSuccess(data: unknown, meta: EnvelopeMeta, startedAt: number): void {
  console.log(
    JSON.stringify(createSuccessEnvelope(data, { ...meta, durationMs: Date.now() - startedAt }), null, 2),
  );
}

/**
 * Emits the sole ERROR envelope on stdout and marks the process failed.
 *
 * Every failure path in this command group goes through here; the exit code and
 * the envelope kind are set together so they can never disagree.
 */
export function emitError(
  code: ErrorCode,
  message: string,
  meta: EnvelopeMeta,
  startedAt: number,
): void {
  process.exitCode = 1;
  console.log(
    JSON.stringify(createErrorEnvelope(code, message, { ...meta, durationMs: Date.now() - startedAt }), null, 2),
  );
}

/**
 * Classifies a throw from `PatternCatalogService`.
 *
 * The service's anti-vacuity guard throws when there is no pattern corpus (rather
 * than reporting an empty catalogue as success). That is a corpus/IO condition,
 * not a bug in the CLI, so it must reach the caller as a readable IO_ERROR — never
 * as an escaped stack trace.
 */
export function classifyCatalogError(error: unknown): { code: ErrorCode; message: string } {
  const message = error instanceof Error ? error.message : String(error);
  const isCorpusProblem =
    /No canonical pattern directory|found zero PAT records|Canonical pattern error|ENOENT/i.test(message);
  return { code: isCorpusProblem ? 'IO_ERROR' : 'INTERNAL_ERROR', message };
}

/**
 * Resolves the Core checkout that holds `reference/**` (where PAT records live).
 *
 * Explicit `--core` wins, then the configured profile, then the working directory —
 * the same order the other reference-backed catalogues (`adr`, `standards`) use.
 */
export function resolveCorePath(explicitCore: string | undefined, profileCore: string | undefined): string {
  return explicitCore || profileCore || process.cwd();
}

/**
 * Parses the tri-state `--enforced [bool]` flag.
 * Bare `--enforced` means true; `--enforced false` filters to UNENFORCED patterns.
 * Returns `undefined` for "no filter"; throws on anything unparseable.
 */
export function parseEnforcedFlag(value: unknown): boolean | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value === 'boolean') return value;
  const normalized = String(value).trim().toLowerCase();
  if (['true', 'yes', '1'].includes(normalized)) return true;
  if (['false', 'no', '0'].includes(normalized)) return false;
  throw new Error(`Invalid --enforced value "${String(value)}" (expected true or false)`);
}
