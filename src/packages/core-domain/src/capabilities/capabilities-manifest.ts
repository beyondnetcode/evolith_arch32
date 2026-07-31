/**
 * Versioned capability manifest for the stateless Evolith Core Evaluation Engine
 * (GT-513 · EAG-06 — Stable API + capabilities manifest).
 *
 * A machine-readable, SemVer-versioned manifest that external consumers can
 * fetch (over REST / CLI / MCP) to discover WHAT the Core can evaluate, WHICH
 * rule engines it runs, WHICH surfaces expose it, and WHICH consumers it
 * officially supports. The manifest carries a `sha256` content fingerprint
 * (hex of the canonical, key-sorted JSON of every field EXCEPT `sha256`) so a
 * parity check can detect drift between a published manifest and the code that
 * produced it.
 *
 * Contracts mirrored here (single source of truth):
 *  - `evaluationKinds` are the keys of {@link EvaluationResult.results} — the
 *    governance "kinds" the Core can produce. A compile-time guard keeps the
 *    list in lockstep with the contract (see `_kindsAreExhaustive`).
 *  - `engines` are the `RuleExecutionRef['engine']` literals.
 *  - `schemaVersion` re-exposes {@link EVALUATION_RESULT_SCHEMA_VERSION}.
 *
 * The Core measures/exposes; it never mutates. Everything here is `readonly`.
 */

import {
  EVALUATION_RESULT_SCHEMA_VERSION,
  KNOWN_RULE_ENGINES,
  type EvaluationResult,
  type RuleExecutionRef,
} from '../evaluation/contracts/evaluation-result';
import { sha256Hex } from './capability-fingerprint';
import { CAPABILITY_OPERATIONS } from './capability-operations.generated';
import {
  capabilityOperationsFingerprint,
  type CapabilityOperation,
} from './capability-operations';

// ---------------------------------------------------------------------------
// Stable identity + defaults
// ---------------------------------------------------------------------------

/** Canonical package name of the Core exposed to consumers. */
export const CAPABILITY_MANIFEST_NAME = 'evolith-core' as const;

/** Default SemVer of the manifest itself (bumped on capability changes). */
export const CAPABILITY_MANIFEST_VERSION = '1.0.0';

/** Surfaces that expose the Core's evaluation API. */
export const CAPABILITY_SURFACES = ['rest', 'cli', 'mcp'] as const;

/**
 * Consumers the Core officially supports. `'external'` is included by default
 * to fix the machine-contracts single-consumer gap (previously only
 * `evolith_tracker`): the manifest is stable and public, so any external
 * consumer may rely on it.
 */
export const DEFAULT_SUPPORTED_CONSUMERS = ['evolith_tracker', 'external'] as const;

/**
 * The evaluation "kinds" the Core can produce — the keys of
 * {@link EvaluationResult.results}. Kept in lockstep with the contract by the
 * compile-time exhaustiveness guard below.
 */
export const EVALUATION_KINDS = [
  'gate',
  'artifact',
  'evidence',
  'architecture',
  'blueprint',
  'topology',
  'checkpoint',
  'deployment',
  'compliance',
  'design',
  'phaseArtifacts',
] as const satisfies readonly (keyof EvaluationResult['results'])[];

/** Rule engines the Core can execute (mirrors `RuleExecutionRef['engine']`). */
export const RULE_ENGINES = KNOWN_RULE_ENGINES satisfies readonly RuleExecutionRef['engine'][];

// Compile-time drift guards: if a new key is added to EvaluationResult.results
// (or a new engine literal) without updating the arrays above, these error.
type _MissingKinds = Exclude<keyof EvaluationResult['results'], (typeof EVALUATION_KINDS)[number]>;
type _MissingEngines = Exclude<RuleExecutionRef['engine'], (typeof RULE_ENGINES)[number]>;
const _kindsAreExhaustive: [_MissingKinds] extends [never] ? true : _MissingKinds = true;
const _enginesAreExhaustive: [_MissingEngines] extends [never] ? true : _MissingEngines = true;
void _kindsAreExhaustive;
void _enginesAreExhaustive;

// ---------------------------------------------------------------------------
// Manifest contract
// ---------------------------------------------------------------------------

/**
 * The versioned capability manifest returned by `GET /api/v1/capabilities`
 * (and mirrored on the CLI/MCP surfaces). Every field is `readonly`.
 */
export interface CapabilityManifest {
  readonly name: 'evolith-core';
  /** SemVer of the manifest. */
  readonly version: string;
  /** {@link EVALUATION_RESULT_SCHEMA_VERSION} of the evaluation contract. */
  readonly schemaVersion: string;
  readonly evaluationKinds: readonly string[];
  readonly engines: readonly string[];
  /** 'rest' | 'cli' | 'mcp' */
  readonly surfaces: readonly string[];
  readonly supportedConsumers: readonly string[];
  /**
   * GT-583 — the per-operation contract: every governed operation with its
   * JSON Schema 2020-12 `inputSchema` and `outputSchema`. GENERATED from the MCP
   * tool registry's own projection; see `capability-operations.generated.ts`.
   */
  readonly operations: readonly CapabilityOperation[];
  /**
   * GT-583 — sha256 of {@link operations} alone, so a consumer can pin the whole
   * per-operation contract with one scalar. This is what {@link sha256} folds in
   * on behalf of `operations`, which is excluded from the manifest fingerprint
   * to keep a pinnable contract from having to embed fifty schemas.
   */
  readonly operationsSha256: string;
  /**
   * sha256 hex of the canonical JSON of this manifest WITHOUT this field and
   * WITHOUT `operations` (covered transitively by `operationsSha256`).
   */
  readonly sha256: string;
}

/** Options to override the manifest defaults (all optional). */
export interface BuildCapabilityManifestOptions {
  /** SemVer override for the manifest version (defaults to 1.0.0). */
  readonly version?: string;
  /** Override the surfaces the Core is exposed on. */
  readonly surfaces?: readonly string[];
  /** Override the supported-consumer list. */
  readonly supportedConsumers?: readonly string[];
  /**
   * GT-583 — override the per-operation catalog. Defaults to the generated
   * {@link CAPABILITY_OPERATIONS}. The override exists for the generator (which
   * must build a manifest from a projection it has just read from the live
   * registry, before that projection has been written to disk) and for tests.
   */
  readonly operations?: readonly CapabilityOperation[];
}

// ---------------------------------------------------------------------------
// SemVer + canonical fingerprinting
// ---------------------------------------------------------------------------

/** Strict-enough SemVer (major.minor.patch with optional pre-release/build). */
const SEMVER_RE =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;

/** True when `value` is a valid SemVer string. */
export function isSemVer(value: string): boolean {
  return SEMVER_RE.test(value);
}

// ---------------------------------------------------------------------------
// Builder + parity fingerprint
// ---------------------------------------------------------------------------

/**
 * Assemble the versioned {@link CapabilityManifest}. The `sha256` is computed
 * over the canonical JSON of the manifest content WITHOUT the `sha256` field and
 * WITHOUT `operations`, so it is stable across calls and recomputable for drift
 * detection. `operations` is excluded because `operationsSha256` — which IS
 * hashed — already covers it: a consumer can pin the whole fifty-operation
 * contract without embedding it (GT-583).
 *
 * @throws RangeError when an explicit `version` is not valid SemVer.
 */
export function buildCapabilityManifest(
  opts: BuildCapabilityManifestOptions = {},
): CapabilityManifest {
  const version = opts.version ?? CAPABILITY_MANIFEST_VERSION;
  if (!isSemVer(version)) {
    throw new RangeError(`Capability manifest version is not valid SemVer: "${version}"`);
  }

  const operations = opts.operations ? [...opts.operations] : [...CAPABILITY_OPERATIONS];

  const content: Omit<CapabilityManifest, 'sha256' | 'operations'> = {
    name: CAPABILITY_MANIFEST_NAME,
    version,
    schemaVersion: EVALUATION_RESULT_SCHEMA_VERSION,
    evaluationKinds: [...EVALUATION_KINDS],
    engines: [...RULE_ENGINES],
    surfaces: opts.surfaces ? [...opts.surfaces] : [...CAPABILITY_SURFACES],
    supportedConsumers: opts.supportedConsumers
      ? [...opts.supportedConsumers]
      : [...DEFAULT_SUPPORTED_CONSUMERS],
    operationsSha256: capabilityOperationsFingerprint(operations),
  };

  return { ...content, operations, sha256: sha256Hex(content) };
}

/**
 * Recompute the sha256 fingerprint from an existing manifest, EXCLUDING its own
 * `sha256` field and its `operations` array. A parity/drift test compares this
 * against `manifest.sha256`: if any capability field changed — including the
 * operation catalog, through `operationsSha256` — the fingerprint changes and
 * the check fails.
 */
export function capabilityManifestFingerprint(
  manifest: Omit<CapabilityManifest, 'operations'> & { operations?: unknown },
): string {
  const { sha256: _ignored, operations: _operations, ...content } = manifest;
  void _ignored;
  void _operations;
  return sha256Hex(content);
}
