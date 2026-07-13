/**
 * Canonical Violation model (GT-511 · EAG-02).
 *
 * ONE normalized shape every enforcer adapter (dependency-cruiser, import-linter,
 * Deptrac, …) and the OSS/native normalizers map into, so downstream surfaces —
 * the CI/PR drift gate (GT-518), freezing/baseline (GT-517) and every enforcer
 * adapter (GT-514/GT-515/GT-521) — consume a single evidence shape instead of two
 * parallel ones that drift apart.
 *
 * Design invariants:
 *  - The {@link Violation.fingerprint} is computed WITHOUT `message` and against a
 *    normalized path, so cosmetic wording changes never churn the fingerprint and
 *    defeat freezing (GT-517). Line/column ARE part of the identity (per-occurrence);
 *    a line-insensitive baseline mode is GT-517's concern, not this model's.
 *  - `Violation` maps losslessly (for shared fields) to the cross-cutting
 *    {@link GapFinding}/{@link RiskFinding} the EvaluationResult already exposes.
 *  - The evidence manifest ({@link EnforcerEvidenceManifest}) carries every field
 *    the evidence ruleset (`evidence-manifest.rules.json`, EVD-01..04) mandates.
 */

import { createHash } from 'node:crypto';

import type { FindingSeverity, GapFinding, RiskFinding, RiskLevel, RuleEngine } from '../evaluation/contracts/evaluation-result';

/** Severity vocabulary a source-analyzer reports. Maps to findings via the maps below. */
export type ViolationSeverity = 'error' | 'warning' | 'info';

/**
 * A single normalized rule violation emitted by an enforcer/source-analyzer.
 *
 * `fingerprint` is derived (see {@link fingerprintViolation}) — callers may pass an
 * empty string to {@link makeViolation} and let it be computed.
 */
export interface Violation {
  /** Rule that was violated (e.g. `HXA-01`, `no-circular`). */
  readonly ruleId: string;
  /** Enforcer tool that produced it (e.g. `dependency-cruiser`, `deptrac`). */
  readonly tool: string;
  /** Repo-relative path of the offending file; `''` for a project-level/locationless finding. */
  readonly file: string;
  /** 1-based line, when the tool reports one. */
  readonly line?: number;
  /** 1-based column, when the tool reports one. */
  readonly column?: number;
  readonly severity: ViolationSeverity;
  /** Human-readable message. NOT part of the fingerprint. */
  readonly message: string;
  /** ADR this rule traces to, when known (e.g. `ADR-0002`). */
  readonly adrRef?: string;
  /** Accountable owner (e.g. a CODEOWNERS entry), when enriched. */
  readonly owner?: string;
  /** Stable identity — normalized path + rule + tool + coords, message EXCLUDED. */
  readonly fingerprint: string;
  /** Baseline/waiver flag: a frozen violation does not block (GT-517). */
  readonly frozen: boolean;
}

// ---------------------------------------------------------------------------
// Severity map (Violation ⇄ findings)
// ---------------------------------------------------------------------------

/** Violation severity → {@link GapFinding} severity (identity — same vocabulary). */
export const VIOLATION_TO_FINDING_SEVERITY: Readonly<Record<ViolationSeverity, FindingSeverity>> = {
  error: 'error',
  warning: 'warning',
  info: 'info',
};

/** Violation severity → {@link RiskFinding} level. */
export const VIOLATION_TO_RISK_LEVEL: Readonly<Record<ViolationSeverity, RiskLevel>> = {
  error: 'high',
  warning: 'medium',
  info: 'low',
};

/** {@link GapFinding} severity → Violation severity (round-trip inverse). */
export const FINDING_SEVERITY_TO_VIOLATION: Readonly<Record<FindingSeverity, ViolationSeverity>> = {
  error: 'error',
  warning: 'warning',
  info: 'info',
};

// ---------------------------------------------------------------------------
// Fingerprint
// ---------------------------------------------------------------------------

/** Normalize a path for stable fingerprinting: posix separators, no `./` prefix, no dup/trailing slashes. */
export function normalizeViolationPath(file: string): string {
  return file
    .replace(/\\/g, '/')
    .replace(/^\.\//, '')
    .replace(/\/{2,}/g, '/')
    // Runs of slashes were already collapsed above, so at most ONE trailing slash can
    // remain — a single-char `\/$` (not `\/+$`) drops it without the polynomial
    // backtracking a `+` quantifier would incur on adversarial `/`-heavy tool paths.
    .replace(/\/$/, '')
    .trim();
}

/**
 * Deterministic identity of a violation, EXCLUDING `message` (cosmetic wording must
 * not churn it) and using the normalized path. Returns a 16-hex-char (64-bit) digest.
 */
export function fingerprintViolation(
  v: Pick<Violation, 'ruleId' | 'tool' | 'file' | 'line' | 'column'>,
): string {
  const material = [
    v.tool,
    v.ruleId,
    normalizeViolationPath(v.file),
    v.line ?? '',
    v.column ?? '',
  ].join('\n');
  return createHash('sha256').update(material).digest('hex').slice(0, 16);
}

/** Build a {@link Violation}, computing the fingerprint when one is not supplied. */
export function makeViolation(input: Omit<Violation, 'fingerprint' | 'frozen'> & { fingerprint?: string; frozen?: boolean }): Violation {
  const { fingerprint, frozen, ...rest } = input;
  return {
    ...rest,
    fingerprint: fingerprint && fingerprint.length > 0 ? fingerprint : fingerprintViolation(rest),
    frozen: frozen ?? false,
  };
}

// ---------------------------------------------------------------------------
// Violation ⇄ GapFinding / RiskFinding
// ---------------------------------------------------------------------------

/** Format `file:line:column` for a finding's `location`. */
export function formatViolationLocation(v: Pick<Violation, 'file' | 'line' | 'column'>): string {
  const path = normalizeViolationPath(v.file);
  if (v.line == null) return path;
  return v.column == null ? `${path}:${v.line}` : `${path}:${v.line}:${v.column}`;
}

export function violationToGapFinding(v: Violation): GapFinding {
  return {
    id: v.fingerprint,
    requirementRef: v.adrRef ?? v.ruleId,
    severity: VIOLATION_TO_FINDING_SEVERITY[v.severity],
    message: v.message,
    location: formatViolationLocation(v),
  };
}

export function violationToRiskFinding(v: Violation): RiskFinding {
  return {
    id: v.fingerprint,
    level: VIOLATION_TO_RISK_LEVEL[v.severity],
    category: v.tool,
    message: v.message,
    location: formatViolationLocation(v),
    ruleRef: v.ruleId,
  };
}

// ---------------------------------------------------------------------------
// Rule-engine vocabulary (tolerance strategy)
// ---------------------------------------------------------------------------

/**
 * Known engines are an OPEN vocabulary: consumers MUST tolerate unknown values
 * (a future engine must not hard-break an older consumer). {@link RuleEngine} and
 * `KNOWN_RULE_ENGINES` live in the contract; these helpers implement the tolerance.
 */
export function isKnownEngine(value: string): value is RuleEngine {
  return value === 'native' || value === 'opa' || value === 'enforcer';
}

/** Return the engine unchanged when known; otherwise keep the raw value (tolerant, non-throwing). */
export function normalizeEngine(value: string): RuleEngine | string {
  return isKnownEngine(value) ? value : value;
}

// ---------------------------------------------------------------------------
// Enforcer evidence manifest (EVD-01..04)
// ---------------------------------------------------------------------------

/**
 * Auditable evidence emitted for one enforcer run. Field set satisfies every rule
 * in `src/rulesets/evidence/evidence-manifest.rules.json`:
 *  - EVD-01 (identity):    id, source, generatedAt, producer, relatedRuleIds|relatedGateId
 *  - EVD-02 (traceability): sourceRef
 *  - EVD-03 (integrity):    status, evaluatedRules, blockingFailures, waiverRef?
 *  - EVD-04 (retention):    retentionPeriod?, owner?
 */
export interface EnforcerEvidenceManifest {
  readonly id: string;
  readonly source: string;
  readonly sourceRef: string;
  readonly generatedAt: string;
  readonly producer: string;
  readonly engine: RuleEngine;
  readonly relatedRuleIds: readonly string[];
  readonly relatedGateId?: string;
  readonly status: 'pass' | 'fail' | 'warn';
  readonly evaluatedRules: readonly string[];
  readonly blockingFailures: number;
  readonly waiverRef?: string;
  readonly retentionPeriod?: string;
  readonly owner?: string;
  readonly violations: readonly Violation[];
}

/** Which EVD rule each manifest field discharges — the anti-orphan contract (GT-511 AC3). */
export const ENFORCER_EVIDENCE_EVD_COVERAGE: Readonly<Record<string, readonly string[]>> = {
  'EVD-01': ['id', 'source', 'generatedAt', 'producer', 'relatedRuleIds'],
  'EVD-02': ['sourceRef'],
  'EVD-03': ['status', 'evaluatedRules', 'blockingFailures'],
  'EVD-04': ['retentionPeriod', 'owner'],
};

export interface BuildEnforcerEvidenceInput {
  readonly id: string;
  readonly source: string;
  readonly sourceRef: string;
  readonly generatedAt: string;
  readonly producer: string;
  readonly violations: readonly Violation[];
  readonly evaluatedRules?: readonly string[];
  readonly relatedGateId?: string;
  readonly waiverRef?: string;
  readonly retentionPeriod?: string;
  readonly owner?: string;
}

/**
 * Assemble an {@link EnforcerEvidenceManifest} from a run's violations, deriving the
 * integrity fields (EVD-03). `blockingFailures` counts non-frozen `error` violations;
 * `status` is `fail` when any block, `warn` when only warnings remain, else `pass`.
 */
export function buildEnforcerEvidence(input: BuildEnforcerEvidenceInput): EnforcerEvidenceManifest {
  const relatedRuleIds = [...new Set(input.violations.map((v) => v.ruleId))].sort();
  const evaluatedRules = input.evaluatedRules ? [...input.evaluatedRules] : relatedRuleIds;
  const blockingFailures = input.violations.filter((v) => v.severity === 'error' && !v.frozen).length;
  const hasWarn = input.violations.some((v) => v.severity === 'warning' && !v.frozen);
  const status: EnforcerEvidenceManifest['status'] = blockingFailures > 0 ? 'fail' : hasWarn ? 'warn' : 'pass';

  return {
    id: input.id,
    source: input.source,
    sourceRef: input.sourceRef,
    generatedAt: input.generatedAt,
    producer: input.producer,
    engine: 'enforcer',
    relatedRuleIds,
    relatedGateId: input.relatedGateId,
    status,
    evaluatedRules,
    blockingFailures,
    waiverRef: input.waiverRef,
    retentionPeriod: input.retentionPeriod,
    owner: input.owner,
    violations: input.violations,
  };
}
