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

import { createHash } from 'node:crypto';

import {
  EVALUATION_RESULT_SCHEMA_VERSION,
  type EvaluationResult,
  type RuleExecutionRef,
} from '../evaluation/contracts/evaluation-result';

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
export const RULE_ENGINES = ['native', 'opa'] as const satisfies readonly RuleExecutionRef['engine'][];

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
  /** sha256 hex of the canonical JSON of this manifest WITHOUT this field. */
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

/** Deterministically sort object keys (recursively); arrays keep their order. */
function sortDeep(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortDeep);
  }
  if (value !== null && typeof value === 'object') {
    const source = value as Record<string, unknown>;
    return Object.keys(source)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = sortDeep(source[key]);
        return acc;
      }, {});
  }
  return value;
}

/** Canonical JSON: stable, key-sorted serialization for stable hashing. */
function canonicalJson(value: unknown): string {
  return JSON.stringify(sortDeep(value));
}

/** sha256 hex of the canonical JSON of `value`. */
function sha256Hex(value: unknown): string {
  return createHash('sha256').update(canonicalJson(value), 'utf8').digest('hex');
}

// ---------------------------------------------------------------------------
// Builder + parity fingerprint
// ---------------------------------------------------------------------------

/**
 * Assemble the versioned {@link CapabilityManifest}. The `sha256` is computed
 * over the canonical JSON of the manifest content WITHOUT the `sha256` field,
 * so it is stable across calls and recomputable for drift detection.
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

  const content: Omit<CapabilityManifest, 'sha256'> = {
    name: CAPABILITY_MANIFEST_NAME,
    version,
    schemaVersion: EVALUATION_RESULT_SCHEMA_VERSION,
    evaluationKinds: [...EVALUATION_KINDS],
    engines: [...RULE_ENGINES],
    surfaces: opts.surfaces ? [...opts.surfaces] : [...CAPABILITY_SURFACES],
    supportedConsumers: opts.supportedConsumers
      ? [...opts.supportedConsumers]
      : [...DEFAULT_SUPPORTED_CONSUMERS],
  };

  return { ...content, sha256: sha256Hex(content) };
}

/**
 * Recompute the sha256 fingerprint from an existing manifest, EXCLUDING its own
 * `sha256` field. A parity/drift test compares this against `manifest.sha256`:
 * if any capability field changed, the fingerprint changes and the check fails.
 */
export function capabilityManifestFingerprint(manifest: CapabilityManifest): string {
  const { sha256: _ignored, ...content } = manifest;
  void _ignored;
  return sha256Hex(content);
}
