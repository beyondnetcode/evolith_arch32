/**
 * Structural-review rubric (GT-535 · ADR-0111 / builds on GT-533).
 *
 * A strict, auditable STRUCTURAL code-review methodology encoded as data so both
 * the code-quality-review skill and the Quality Gate share ONE source of truth.
 * It names seven structural standards and a single, total SEVERITY HIERARCHY, so
 * findings can be RANKED deterministically and the gate can map severity → a
 * block/warn decision (the mapping is pure even though the findings themselves are
 * LLM-derived and therefore `probabilistic`).
 *
 * Attribution (respected per ADR-0111 §6): this rubric is INSPIRED BY the widely
 * shared "structural / thermo-nuclear" code-review methodology popularized in the
 * Cursor community (code-judo, file-size discipline, spaghetti/abstraction/layering
 * checks, an explicit severity hierarchy). The seven standards below are RE-EXPRESSED
 * in our own words — no proprietary text is copied verbatim. See {@link RUBRIC_ATTRIBUTION}.
 *
 * Layering: PURE domain. No I/O, no LLM, no provider knowledge — the probabilistic
 * collection happens behind the `IStructuralReviewer` port (application layer). This
 * module only DEFINES the standards, the ranking, and the attribution.
 */

import type { EvidenceFindingSeverity } from '@beyondnet/evolith-core-domain/evaluation/contracts';

/** Stable id for the evidence `source`/provider (ADR-0111 §4). */
export const STRUCTURAL_REVIEW_SOURCE = 'structural-review';

/** Version of THIS rubric encoding (stamped into provenance.adapterVersion). */
export const STRUCTURAL_RUBRIC_VERSION = '1.0.0';

/**
 * Attribution for the source methodology (ADR-0111 §6). Kept as data so it can be
 * surfaced in audits and never lost. We cite the methodology and re-express it in
 * our own words rather than copying any proprietary rubric text.
 */
export const RUBRIC_ATTRIBUTION = {
  /** Human-readable name of the methodology this rubric encodes. */
  methodology: 'Structural ("thermo-nuclear") code-review methodology',
  /** Where the methodology comes from (community-shared, Cursor ecosystem). */
  origin: 'Cursor community structural-review rubric (community-shared)',
  /** How we relate to it: re-expressed, not copied. */
  note: 'Standards re-expressed in our own words; no proprietary text reproduced.',
} as const;

/** The seven structural standards, by stable id. */
export type StructuralStandardId =
  | 'code-judo'
  | 'file-size-discipline'
  | 'spaghetti-detection'
  | 'abstraction-quality'
  | 'layering-and-boundaries'
  | 'duplication-and-dry'
  | 'dead-code-and-scope';

/** One structural standard in the rubric. */
export interface StructuralStandard {
  readonly id: StructuralStandardId;
  /** Short human name. */
  readonly name: string;
  /** What the standard checks for, in our own words. */
  readonly description: string;
  /**
   * The DEFAULT severity a violation of this standard carries. A concrete finding
   * MAY override it (the reviewer decides how bad THIS instance is), but the default
   * anchors the standard's baseline weight in the hierarchy.
   */
  readonly defaultSeverity: EvidenceFindingSeverity;
}

/**
 * The rubric: seven structural standards, re-expressed from the source methodology.
 * Order here is declaration order, NOT severity — severity is a separate, total
 * hierarchy ({@link STRUCTURAL_SEVERITY_RANK}).
 */
export const STRUCTURAL_STANDARDS: readonly StructuralStandard[] = [
  {
    id: 'layering-and-boundaries',
    name: 'Layering & boundary integrity',
    description:
      'Architectural layers and module boundaries are respected: no inward layer ' +
      'imports an outward one (e.g. domain importing infra), no dependency-direction ' +
      'inversion, no reach-through past a port. Boundary breaks are the most corrosive ' +
      'structural regressions because they compound.',
    defaultSeverity: 'critical',
  },
  {
    id: 'spaghetti-detection',
    name: 'Spaghetti / control-flow tangle',
    description:
      'Control flow reads top-to-bottom without deep nesting, hidden coupling, or ' +
      'action-at-a-distance. Tangled, non-linear code that cannot be reasoned about ' +
      'locally is flagged.',
    defaultSeverity: 'high',
  },
  {
    id: 'abstraction-quality',
    name: 'Abstraction quality',
    description:
      'Abstractions earn their keep: no premature, leaky, or wrong-level abstraction, ' +
      'and names reveal intent. A wrong abstraction is worse than duplication.',
    defaultSeverity: 'high',
  },
  {
    id: 'code-judo',
    name: 'Code-judo / simplicity',
    description:
      'The change is the simplest one that works — it redirects existing force rather ' +
      'than adding mechanism. Over-engineering, needless indirection, and speculative ' +
      'generality are flagged.',
    defaultSeverity: 'medium',
  },
  {
    id: 'duplication-and-dry',
    name: 'Duplication / DRY',
    description:
      'Repeated knowledge is consolidated — but only when a RIGHT abstraction exists ' +
      '(this defers to abstraction-quality; do not DRY into a wrong abstraction).',
    defaultSeverity: 'medium',
  },
  {
    id: 'file-size-discipline',
    name: 'File & function-size discipline',
    description:
      'Files and functions stay within a sane size budget. Oversized units are a ' +
      'structural smell that hides missing decomposition.',
    defaultSeverity: 'low',
  },
  {
    id: 'dead-code-and-scope',
    name: 'Dead code & scope discipline',
    description:
      'No unused/dead code and no scope creep beyond the change intent: the diff stays ' +
      'minimal and reviewable.',
    defaultSeverity: 'low',
  },
];

/** Fast lookup of a standard by id. */
export const STRUCTURAL_STANDARD_BY_ID: ReadonlyMap<StructuralStandardId, StructuralStandard> = new Map(
  STRUCTURAL_STANDARDS.map((s) => [s.id, s]),
);

/**
 * The single, TOTAL severity hierarchy — the rubric's ranking axis. Reuses the
 * canonical {@link EvidenceFindingSeverity} scale so a rubric severity maps directly
 * onto Evidence findings and onto the gate mapping with no translation.
 * Higher number = more severe.
 */
export const STRUCTURAL_SEVERITY_RANK: Readonly<Record<EvidenceFindingSeverity, number>> = {
  info: 0,
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

/** Compare two severities by the hierarchy. Positive when `a` is MORE severe. */
export function compareSeverity(a: EvidenceFindingSeverity, b: EvidenceFindingSeverity): number {
  return STRUCTURAL_SEVERITY_RANK[a] - STRUCTURAL_SEVERITY_RANK[b];
}

/** The most severe of two severities (used to fold a finding set to a peak). */
export function maxSeverity(a: EvidenceFindingSeverity, b: EvidenceFindingSeverity): EvidenceFindingSeverity {
  return compareSeverity(a, b) >= 0 ? a : b;
}
