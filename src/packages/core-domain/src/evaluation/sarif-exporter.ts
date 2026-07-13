/**
 * Generic SARIF 2.1.0 exporter + evidence-manifest emitter (GT-518 · EAG-13).
 *
 * The MIRROR of the SARIF ingester (`../application/validators/enforcement/sarif-ingester`):
 * that reads any SARIF 2.1.0 log INTO canonical {@link Violation}s; this writes an
 * {@link EvaluationResult}'s findings BACK OUT as a valid SARIF 2.1.0 log for the
 * CI/PR drift gate (GT-518) and any SARIF-consuming code scanner (GitHub code
 * scanning, etc.). The two are round-trippable in spirit: `file:line:col` locations,
 * rule ids and severity/level all survive the round trip.
 *
 * It also re-uses {@link buildEnforcerEvidence} to emit the auditable evidence
 * manifest (EVD-01..04) for a result, converting each {@link GapFinding} into a
 * canonical {@link Violation} so a single evidence shape is produced regardless of
 * which surface asked for it.
 *
 * Pure: no `fs`, no `process`, no clock — `generatedAt` comes from the result.
 */

import type {
  EvaluationResult,
  FindingSeverity,
  GapFinding,
  RiskFinding,
  RiskLevel,
} from './contracts/evaluation-result';
import {
  buildEnforcerEvidence,
  FINDING_SEVERITY_TO_VIOLATION,
  makeViolation,
  type EnforcerEvidenceManifest,
  type Violation,
} from '../domain/violation';
import { enrichViolationsWithCompliance } from '../domain/compliance';

/** SARIF `result.level` vocabulary this exporter emits (a subset of the spec). */
export type SarifLevel = 'error' | 'warning' | 'note';

/** Canonical SARIF 2.1.0 identifiers. */
export const SARIF_VERSION = '2.1.0';
export const SARIF_SCHEMA_URI = 'https://json.schemastore.org/sarif-2.1.0.json';

/** Default driver name when the caller supplies none. */
export const DEFAULT_SARIF_TOOL_NAME = 'evolith-core';

/** Producer stamped on an emitted evidence manifest (EVD-01). */
export const EVALUATION_EVIDENCE_PRODUCER = 'evolith-core';

// ---------------------------------------------------------------------------
// Minimal SARIF 2.1.0 OUTPUT shapes (only what this exporter writes).
// Non-optional where we always emit — the mirror of the ingester's read shapes.
// ---------------------------------------------------------------------------

export interface SarifArtifactLocation {
  readonly uri: string;
}
export interface SarifRegion {
  readonly startLine: number;
  readonly startColumn?: number;
}
export interface SarifPhysicalLocation {
  readonly artifactLocation: SarifArtifactLocation;
  readonly region?: SarifRegion;
}
export interface SarifLocation {
  readonly physicalLocation: SarifPhysicalLocation;
}
export interface SarifMessage {
  readonly text: string;
}
export interface SarifResult {
  readonly ruleId: string;
  readonly level: SarifLevel;
  readonly message: SarifMessage;
  readonly locations?: readonly SarifLocation[];
}
/** SARIF `reportingDescriptor` — we emit only the `id` for traceability. */
export interface SarifReportingDescriptor {
  readonly id: string;
}
export interface SarifDriver {
  readonly name: string;
  readonly version?: string;
  readonly rules: readonly SarifReportingDescriptor[];
}
export interface SarifTool {
  readonly driver: SarifDriver;
}
export interface SarifRun {
  readonly tool: SarifTool;
  readonly results: readonly SarifResult[];
}
export interface SarifLog {
  readonly version: typeof SARIF_VERSION;
  readonly $schema: string;
  readonly runs: readonly SarifRun[];
}

// ---------------------------------------------------------------------------
// Severity / level maps (finding → SARIF level)
// ---------------------------------------------------------------------------

/** {@link GapFinding} severity → SARIF level (`info` has no SARIF peer → `note`). */
export const GAP_SEVERITY_TO_SARIF_LEVEL: Readonly<Record<FindingSeverity, SarifLevel>> = {
  error: 'error',
  warning: 'warning',
  info: 'note',
};

/** {@link RiskFinding} level → SARIF level (critical/high both escalate to `error`). */
export const RISK_LEVEL_TO_SARIF_LEVEL: Readonly<Record<RiskLevel, SarifLevel>> = {
  critical: 'error',
  high: 'error',
  medium: 'warning',
  low: 'note',
};

// ---------------------------------------------------------------------------
// Location parsing (`file:line:col` → parts) — inverse of formatViolationLocation
// ---------------------------------------------------------------------------

/**
 * Peel an optional trailing `:line` and `:col` (integers) off a finding location.
 * The lazy first group keeps colon segments that are NOT a numeric suffix inside the
 * path (so `a:b.ts` stays the uri). Missing input yields `undefined` (no location).
 */
const LOCATION_RE = /^(.+?)(?::(\d+)(?::(\d+))?)?$/;

export function parseFindingLocation(
  location: string | undefined,
): { readonly uri: string; readonly startLine?: number; readonly startColumn?: number } | undefined {
  if (!location) return undefined;
  const match = LOCATION_RE.exec(location);
  if (!match) return { uri: location };
  return {
    uri: match[1],
    startLine: match[2] ? Number(match[2]) : undefined,
    startColumn: match[3] ? Number(match[3]) : undefined,
  };
}

/** Build the SARIF `locations` array for a finding, omitting `region` when there is no line. */
function toSarifLocations(location: string | undefined): readonly SarifLocation[] | undefined {
  const parsed = parseFindingLocation(location);
  if (!parsed) return undefined;
  const region: SarifRegion | undefined =
    parsed.startLine != null
      ? { startLine: parsed.startLine, ...(parsed.startColumn != null ? { startColumn: parsed.startColumn } : {}) }
      : undefined;
  const physicalLocation: SarifPhysicalLocation = {
    artifactLocation: { uri: parsed.uri },
    ...(region ? { region } : {}),
  };
  return [{ physicalLocation }];
}

function gapToSarifResult(gap: GapFinding): SarifResult {
  const locations = toSarifLocations(gap.location);
  return {
    ruleId: gap.requirementRef || gap.id,
    level: GAP_SEVERITY_TO_SARIF_LEVEL[gap.severity],
    message: { text: gap.message },
    ...(locations ? { locations } : {}),
  };
}

function riskToSarifResult(risk: RiskFinding): SarifResult {
  const locations = toSarifLocations(risk.location);
  return {
    ruleId: risk.ruleRef || risk.id,
    level: RISK_LEVEL_TO_SARIF_LEVEL[risk.level],
    message: { text: risk.message },
    ...(locations ? { locations } : {}),
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface SarifExportOptions {
  readonly toolName?: string;
  readonly toolVersion?: string;
}

/**
 * Export an {@link EvaluationResult}'s gaps and risks as a valid SARIF 2.1.0 log
 * (one run). Each {@link GapFinding}/{@link RiskFinding} becomes one SARIF `result`
 * with a mapped `level`, a `message` and — when a `file:line:col` location is present —
 * a `physicalLocation`. The distinct rule ids are also listed under
 * `tool.driver.rules` for traceability. Defaults: name `evolith-core`, version
 * `result.versions.core`.
 */
export function exportEvaluationResultToSarif(
  result: EvaluationResult,
  opts: SarifExportOptions = {},
): SarifLog {
  const results: readonly SarifResult[] = [
    ...result.gaps.map(gapToSarifResult),
    ...result.risks.map(riskToSarifResult),
  ];
  const rules: readonly SarifReportingDescriptor[] = [...new Set(results.map((r) => r.ruleId))]
    .sort()
    .map((id) => ({ id }));

  const version = opts.toolVersion ?? result.versions?.core;
  const driver: SarifDriver = {
    name: opts.toolName ?? DEFAULT_SARIF_TOOL_NAME,
    ...(version ? { version } : {}),
    rules,
  };

  return {
    version: SARIF_VERSION,
    $schema: SARIF_SCHEMA_URI,
    runs: [{ tool: { driver }, results }],
  };
}

/**
 * Convert an {@link EvaluationResult}'s gaps into canonical {@link Violation}s (rule id =
 * `requirementRef`, ADR ref preserved when the requirement is an `ADR-*` ref). `source` labels
 * the producing tool/gate. Shared by {@link emitEvaluationEvidence} and the drift gate so a
 * single mapping produces the evidence manifest regardless of which surface asked for it.
 */
export function evaluationResultToViolations(result: EvaluationResult, source: string): Violation[] {
  return result.gaps.map((gap) => {
    const parsed = parseFindingLocation(gap.location);
    // `requirementRef` is the rule id OR an ADR ref (violationToGapFinding uses `adrRef ?? ruleId`);
    // keep the ADR shape so the compliance mapping (byAdr) resolves (GT-525).
    const ref = gap.requirementRef || gap.id;
    const adrRef = /^ADR-/i.test(gap.requirementRef ?? '') ? gap.requirementRef : undefined;
    return makeViolation({
      ruleId: ref,
      adrRef,
      tool: source,
      file: parsed?.uri ?? '',
      line: parsed?.startLine,
      column: parsed?.startColumn,
      severity: FINDING_SEVERITY_TO_VIOLATION[gap.severity],
      message: gap.message,
    });
  });
}

/**
 * Emit the auditable evidence manifest (EVD-01..04) for an evaluation result. Each
 * {@link GapFinding} is converted to a canonical {@link Violation} (rule id =
 * `requirementRef`), then {@link buildEnforcerEvidence} derives the integrity fields
 * (EVD-03: status, blockingFailures). `generatedAt` is taken from `result.evaluatedAt`
 * (pure — no clock). `source` labels the evidence origin (e.g. a ruleset/gate ref).
 */
export function emitEvaluationEvidence(result: EvaluationResult, source: string): EnforcerEvidenceManifest {
  // GT-525: attribute each violation to its compliance control(s) before emitting evidence.
  const violations = enrichViolationsWithCompliance(evaluationResultToViolations(result, source));

  const evaluatedRules = [...new Set(result.rulesExecuted.map((r) => r.ruleId))].sort();
  const sourceRef =
    result.correlationId ??
    (result.versions?.core ? `core@${result.versions.core}` : `run@${result.evaluatedAt}`);

  return buildEnforcerEvidence({
    id: `evidence:${source}:${result.correlationId ?? result.evaluatedAt}`,
    source,
    sourceRef,
    generatedAt: result.evaluatedAt,
    producer: EVALUATION_EVIDENCE_PRODUCER,
    violations,
    evaluatedRules: evaluatedRules.length > 0 ? evaluatedRules : undefined,
  });
}
