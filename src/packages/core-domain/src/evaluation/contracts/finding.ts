/**
 * Canonical Finding model.
 *
 * ONE normalized shape for "something is worth reporting here", so a finding can
 * travel PR review → scorecard → knowledge base without being hand-translated at
 * each hop. Today six parallel shapes coexist and every translation loses fields:
 *
 *  | shape             | home                                                  |
 *  |-------------------|-------------------------------------------------------|
 *  | `EvidenceFinding` | `evaluation/contracts/quality-evidence.ts`             |
 *  | `RiskFinding`     | `evaluation/contracts/evaluation-result.ts`           |
 *  | `GapFinding`      | `evaluation/contracts/evaluation-result.ts`           |
 *  | `GateViolation`   | `domain/gate-evidence.ts`                             |
 *  | `ValidationIssue` | `application/validators/ruleset-validator.types.ts`   |
 *  | `Violation`       | `domain/violation.ts`                                 |
 *
 * This module is STRICTLY ADDITIVE: it does not modify any of the six, and the
 * mappers below are pure one-way adapters. Nothing here is a replacement — the
 * six remain the wire shapes of their respective subsystems.
 *
 * Design invariants:
 *  - **Provenance is mandatory** (ADR-0111 §6). None of the six carries it, so
 *    every mapper REQUIRES the caller to supply it. A finding whose origin is
 *    unknown cannot be constructed.
 *  - **Determinism is explicit** (ADR-0111). A probabilistic finding (an LLM
 *    auditor's opinion) must never be presentable as a fact, so `determinism` is
 *    required rather than defaulted — no mapper guesses it.
 *  - **Advisory by construction.** `advisory` is the literal `true`, mirroring
 *    `DecisionRecommendation.binding: false` (ADR-0101): the Core reports, the
 *    Tracker decides. Nothing on this type expresses blocking authority.
 *    A producer's own blocking opinion (`ValidationIssue.blocking`,
 *    `Violation.frozen`) survives in {@link Finding.attributes} as an opaque,
 *    non-authoritative producer annotation.
 *  - **Lossless-or-absent.** Where a source shape cannot fill a canonical field,
 *    the mapper LEAVES IT ABSENT rather than inventing a default. In particular
 *    `id` is optional: three of the six carry no identity of their own, and
 *    synthesizing one would fabricate stability that the source does not have.
 */

import type { Determinism, Provenance } from './quality-evidence';
import type { EvidenceFinding } from './quality-evidence';
import type { GapFinding, RiskFinding } from './evaluation-result';
import type { GateViolation } from '../../domain/gate-evidence';
import type { Violation } from '../../domain/violation';

/**
 * Structural mirror of `application/validators/ruleset-validator.types.ts`'s
 * `ValidationIssue`.
 *
 * Declared here rather than imported because this module is a DOMAIN contract and
 * `application/` sits above it — importing upward would invert the layering the
 * `eslint-plugin-boundaries` guard enforces. The real `ValidationIssue` is proven
 * assignable to this shape by a compile-time assertion in the spec, so the two
 * cannot drift apart silently.
 */
export interface ValidationIssueLike {
  readonly ruleId: string;
  readonly severity: 'MUST' | 'SHOULD' | 'COULD';
  readonly category: string;
  readonly title: string;
  readonly description: string;
  readonly file?: string;
  readonly expected?: string;
  readonly actual?: string;
  readonly blocking: boolean;
}

/** Schema version of this contract (bumped only on incompatible changes). */
export const FINDING_SCHEMA_VERSION = '1.0.0';

// ---------------------------------------------------------------------------
// Severity
// ---------------------------------------------------------------------------

/**
 * Canonical severity scale.
 *
 * Reconciles the four vocabularies the six shapes already use:
 *  - `info | low | medium | high | critical` (EvidenceFinding) — the WIDEST
 *  - `low | medium | high | critical`        (RiskFinding.level) — a subset
 *  - `error | warning | info`                (GapFinding, Violation)
 *  - `error | warning`                       (GateViolation)
 *  - `MUST | SHOULD | COULD`                 (ValidationIssue)
 *
 * The 5-level scale is chosen because it is the only one that is a strict
 * SUPERSET of another existing vocabulary (it contains RiskLevel verbatim), so
 * two of the six map by identity and no producer is forced into a coarser bucket
 * than it already used. The `error/warning` and `MUST/SHOULD/COULD` vocabularies
 * are *dispositions*, not magnitudes; projecting them onto a magnitude scale is
 * inherently interpretive, so the verbatim token is always preserved in
 * {@link Finding.sourceSeverity} and the projection is never treated as reversible.
 */
export const FINDING_SEVERITIES = ['info', 'low', 'medium', 'high', 'critical'] as const;
export type CanonicalSeverity = (typeof FINDING_SEVERITIES)[number];

/**
 * `error | warning | info` → canonical. Used by GapFinding, Violation and (for
 * its two-member subset) GateViolation.
 *
 * `error` maps to `high`, NOT `critical`: `critical` is reserved for producers
 * that distinguish a top band explicitly (EvidenceFinding, RiskFinding). A
 * three-level producer cannot mean "critical" — it has no such token — and
 * promoting it would silently inflate severity across the hop.
 */
export const DISPOSITION_TO_SEVERITY: Readonly<Record<'error' | 'warning' | 'info', CanonicalSeverity>> = {
  error: 'high',
  warning: 'medium',
  info: 'info',
};

/**
 * `MUST | SHOULD | COULD` → canonical. RFC-2119-style obligation levels are
 * mapped to the same bands as `error | warning | info`, except `COULD` becomes
 * `low` rather than `info`: an unmet optional requirement is still a (small)
 * shortfall, whereas `info` in the other vocabularies means "not a shortfall".
 */
export const OBLIGATION_TO_SEVERITY: Readonly<Record<'MUST' | 'SHOULD' | 'COULD', CanonicalSeverity>> = {
  MUST: 'high',
  SHOULD: 'medium',
  COULD: 'low',
};

// ---------------------------------------------------------------------------
// Location
// ---------------------------------------------------------------------------

/**
 * Where a finding points. A REFERENCE, never a copy of the offending content.
 *
 * Structured because `Violation` already carries `file`/`line`/`column`
 * separately and flattening them to a string would lose the coordinates. Sources
 * that carry only an opaque pointer (an artifact name, a URL, a CSS selector)
 * land in `ref` — `path` is reserved for something that is actually a repo path.
 */
export interface FindingLocation {
  /** Repo-relative path, when the pointer is a file path. */
  readonly path?: string;
  /** 1-based line, when known. */
  readonly line?: number;
  /** 1-based column, when known. */
  readonly column?: number;
  /** Opaque pointer that is not a parseable file path (url, selector, artifact id). */
  readonly ref?: string;
}

/**
 * Parse a producer's free-form location string into a {@link FindingLocation}.
 *
 * Recognizes the `path:line[:column]` convention `formatViolationLocation()`
 * emits, so a Violation that was already flattened elsewhere round-trips back to
 * coordinates. Anything else (url, selector, artifact name, empty) is kept
 * verbatim in `ref` — we never guess that an arbitrary string is a file path,
 * because a wrong `path` is worse than an honest `ref`.
 */
export function parseFindingLocation(raw: string | undefined): FindingLocation | undefined {
  const value = raw?.trim();
  if (!value) return undefined;

  // A URL/scheme (`https://…`, `file://…`) would false-positive on the `:line`
  // pattern, so it is excluded before the coordinate match.
  const isUrlLike = /^[a-z][a-z0-9+.-]*:\/\//i.test(value);
  if (!isUrlLike) {
    const withColumn = /^(.+):(\d+):(\d+)$/.exec(value);
    if (withColumn) {
      return { path: withColumn[1], line: Number(withColumn[2]), column: Number(withColumn[3]) };
    }
    const withLine = /^(.+):(\d+)$/.exec(value);
    if (withLine) {
      return { path: withLine[1], line: Number(withLine[2]) };
    }
  }
  return { ref: value };
}

// ---------------------------------------------------------------------------
// Finding
// ---------------------------------------------------------------------------

/**
 * Producer-scoped annotations the canonical model deliberately does NOT
 * interpret. This is where a source shape's private fields survive the hop
 * without being promoted to canonical meaning — including any blocking opinion
 * the producer held. Values are scalars so the shape stays serializable and
 * diffable.
 */
export type FindingAttributes = Readonly<Record<string, string | number | boolean>>;

/**
 * The canonical finding.
 *
 * Advisory by construction: there is no `blocking`, no `verdict` and no
 * `outcome` on this type. Whether a finding stops anything is a decision the
 * Tracker's gate makes from policy, never a property the finding asserts.
 */
export interface Finding {
  /**
   * Stable identity, when the SOURCE has one (`Violation.fingerprint`,
   * `RiskFinding.id`, `GapFinding.id`). ABSENT when the source carries none —
   * never synthesized, because a fabricated id would look stable across runs
   * while silently churning.
   */
  readonly id?: string;
  /** Machine code of the rule/check that fired (`ruleId`, `code`). Always present. */
  readonly code: string;
  readonly severity: CanonicalSeverity;
  /**
   * The producer's severity token, VERBATIM (`'MUST'`, `'error'`, `'critical'`).
   * Kept because {@link CanonicalSeverity} is an interpretive projection: this is
   * what makes the projection auditable rather than lossy.
   */
  readonly sourceSeverity: string;
  /** Short label, when the source distinguishes one from the body (ValidationIssue). */
  readonly title?: string;
  /** Human-readable body. Always present. */
  readonly message: string;
  /** Producer's classification (`security`, `architecture`, tool name, …). */
  readonly category?: string;
  readonly location?: FindingLocation;
  /**
   * Governance references this finding traces to — ADR ids, requirement refs,
   * rule refs. Unified because the six spread the same idea across
   * `adrRef`, `requirementRef` and `ruleRef`.
   */
  readonly traceRefs?: readonly string[];
  /** Accountable owner (e.g. a CODEOWNERS entry), when the source enriched one. */
  readonly owner?: string;
  /** Deterministic tool vs probabilistic (LLM-based) producer. Never inferred. */
  readonly determinism: Determinism;
  /** Mandatory origin — ADR-0111 §6. */
  readonly provenance: Provenance;
  /** Uninterpreted producer annotations (see {@link FindingAttributes}). */
  readonly attributes?: FindingAttributes;
  /**
   * Always `true`. A finding is a report, not a decision (ADR-0101); the literal
   * type makes that unspoofable rather than conventional.
   */
  readonly advisory: true;
}

/**
 * What every mapper needs and NO source shape carries: who produced this and how
 * much it can be trusted. Required by construction so an unattributed finding is
 * a compile error, not a runtime surprise.
 */
export interface FindingOrigin {
  readonly provenance: Provenance;
  readonly determinism: Determinism;
}

/** Drop undefined-valued keys so "absent" is genuinely absent, not `{ x: undefined }`. */
function compact(finding: Finding): Finding {
  const entries = Object.entries(finding).filter(([, v]) => v !== undefined);
  return Object.fromEntries(entries) as unknown as Finding;
}

// ---------------------------------------------------------------------------
// Mappers (pure, one-way, additive — no source shape is modified)
// ---------------------------------------------------------------------------

/**
 * `EvidenceFinding` → canonical.
 *
 * LOSES nothing; GAINS nothing it cannot know: EvidenceFinding has no identity,
 * no category and no trace refs, so `id`, `category` and `traceRefs` are absent.
 * The determinism/provenance live on the PARENT `Evidence`, which is why the
 * caller must pass them down (see {@link findingsFromEvidence}).
 */
export function findingFromEvidenceFinding(source: EvidenceFinding, origin: FindingOrigin): Finding {
  return compact({
    code: source.code,
    severity: source.severity, // identity: EvidenceFinding already uses the canonical scale
    sourceSeverity: source.severity,
    message: source.message,
    location: parseFindingLocation(source.location),
    determinism: origin.determinism,
    provenance: origin.provenance,
    advisory: true,
  });
}

/**
 * `RiskFinding` → canonical.
 *
 * `level` maps by identity (RiskLevel is a subset of the canonical scale).
 * `ruleRef` becomes a trace ref. RiskFinding has no distinct machine code, so
 * `code` falls back to `ruleRef` and, absent that, to the risk's own `id` —
 * the only two stable identifiers it offers.
 */
export function findingFromRiskFinding(source: RiskFinding, origin: FindingOrigin): Finding {
  return compact({
    id: source.id,
    code: source.ruleRef ?? source.id,
    severity: source.level,
    sourceSeverity: source.level,
    message: source.message,
    category: source.category,
    location: parseFindingLocation(source.location),
    traceRefs: source.ruleRef ? [source.ruleRef] : undefined,
    determinism: origin.determinism,
    provenance: origin.provenance,
    advisory: true,
  });
}

/**
 * `GapFinding` → canonical.
 *
 * `requirementRef` is both the machine code and a trace ref: it is the only
 * rule-shaped identifier a gap carries. Severity is a disposition vocabulary, so
 * it is projected and the token preserved.
 */
export function findingFromGapFinding(source: GapFinding, origin: FindingOrigin): Finding {
  return compact({
    id: source.id,
    code: source.requirementRef,
    severity: DISPOSITION_TO_SEVERITY[source.severity],
    sourceSeverity: source.severity,
    message: source.message,
    location: parseFindingLocation(source.location),
    traceRefs: [source.requirementRef],
    determinism: origin.determinism,
    provenance: origin.provenance,
    advisory: true,
  });
}

/**
 * `GateViolation` → canonical.
 *
 * NOTE the authority inversion this mapper performs on purpose: GateViolation's
 * `severity: 'error'` MEANS "blocks the gate". The canonical finding cannot say
 * that, so the blocking meaning is dropped from the type and only the magnitude
 * survives (`error` → `high`) with the token in `sourceSeverity`. Callers that
 * need the gate outcome must keep using `deriveVerdict()` on the ORIGINAL
 * violations — this model deliberately cannot reconstruct it.
 *
 * GateViolation has no id and no category, so both are absent.
 */
export function findingFromGateViolation(source: GateViolation, origin: FindingOrigin): Finding {
  return compact({
    code: source.ruleId,
    severity: DISPOSITION_TO_SEVERITY[source.severity],
    sourceSeverity: source.severity,
    message: source.message,
    location: parseFindingLocation(source.location),
    traceRefs: [source.ruleId],
    determinism: origin.determinism,
    provenance: origin.provenance,
    advisory: true,
  });
}

/**
 * `ValidationIssue` → canonical.
 *
 * The only source with a title/description SPLIT, which is why the canonical
 * model has an optional `title` at all. `expected`/`actual` have no canonical
 * home (they are a diff, not a finding property) and `blocking` must not become
 * canonical authority — all three survive as uninterpreted
 * {@link FindingAttributes}. `severity` is an obligation vocabulary
 * (MUST/SHOULD/COULD) and is projected via {@link OBLIGATION_TO_SEVERITY}.
 */
export function findingFromValidationIssue(source: ValidationIssueLike, origin: FindingOrigin): Finding {
  const attributes: Record<string, string | number | boolean> = { blocking: source.blocking };
  if (source.expected !== undefined) attributes.expected = source.expected;
  if (source.actual !== undefined) attributes.actual = source.actual;

  return compact({
    code: source.ruleId,
    severity: OBLIGATION_TO_SEVERITY[source.severity],
    sourceSeverity: source.severity,
    title: source.title,
    message: source.description,
    category: source.category,
    location: parseFindingLocation(source.file),
    traceRefs: [source.ruleId],
    determinism: origin.determinism,
    provenance: origin.provenance,
    attributes,
    advisory: true,
  });
}

/**
 * `Violation` → canonical. The RICHEST source: it is the only one carrying a
 * real `fingerprint` (→ `id`), coordinates, an owner and an ADR ref.
 *
 * `tool` is NOT dropped: it is the producer identity and belongs in provenance,
 * so the mapper asserts that the supplied `provenance.collectedBy` is the tool
 * — a caller attributing a dependency-cruiser violation to something else would
 * be laundering its origin. `frozen` (a waiver/baseline flag, i.e. a blocking
 * opinion) survives only as a non-authoritative attribute; `complianceControls`
 * is joined into attributes because {@link FindingAttributes} is scalar-valued.
 * `category` defaults to nothing here — leaving it unset is meaningful upstream
 * ("architecture" is applied downstream, not by this mapper).
 */
export function findingFromViolation(source: Violation, origin: FindingOrigin): Finding {
  const attributes: Record<string, string | number | boolean> = { frozen: source.frozen, tool: source.tool };
  if (source.complianceControls && source.complianceControls.length > 0) {
    attributes.complianceControls = source.complianceControls.join(',');
  }

  const traceRefs = source.adrRef ? [source.ruleId, source.adrRef] : [source.ruleId];

  return compact({
    id: source.fingerprint,
    code: source.ruleId,
    severity: DISPOSITION_TO_SEVERITY[source.severity],
    sourceSeverity: source.severity,
    message: source.message,
    category: source.category,
    location: source.file
      ? { path: source.file, line: source.line, column: source.column }
      : undefined,
    traceRefs,
    owner: source.owner,
    determinism: origin.determinism,
    provenance: origin.provenance,
    attributes,
    advisory: true,
  });
}

// ---------------------------------------------------------------------------
// Convenience
// ---------------------------------------------------------------------------

/**
 * Lift every {@link EvidenceFinding} of a canonical `Evidence` into a
 * {@link Finding}, propagating the parent's determinism and provenance. This is
 * the one place where the origin need not be supplied by hand: `Evidence`
 * already carries both, mandatorily (ADR-0111 §6).
 */
export function findingsFromEvidence(evidence: {
  readonly findings: readonly EvidenceFinding[];
  readonly determinism: Determinism;
  readonly provenance: Provenance;
  readonly dimension?: string;
}): Finding[] {
  const origin: FindingOrigin = {
    determinism: evidence.determinism,
    provenance: evidence.provenance,
  };
  return evidence.findings.map((f) => {
    const base = findingFromEvidenceFinding(f, origin);
    // The dimension the evidence was collected for is the closest thing the
    // evidence model has to a category, so it is promoted here (and only here,
    // where it is actually known) rather than inside the per-finding mapper.
    return evidence.dimension ? compact({ ...base, category: evidence.dimension }) : base;
  });
}

/**
 * True when the finding may be stated as a fact. A probabilistic finding is an
 * opinion and must be presented as one — this predicate exists so callers do not
 * re-derive the rule (and get it wrong) at each hop.
 */
export function isFactual(finding: Finding): boolean {
  return finding.determinism === 'deterministic';
}
