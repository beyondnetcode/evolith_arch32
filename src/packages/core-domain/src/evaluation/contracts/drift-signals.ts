/**
 * AI-drift quality signals (GT-594 · ADR-0101 · ADR-0111 · GT-584 · GT-589).
 *
 * The 167 rulesets and 45 policies reason about structure, boundaries and imports.
 * The failure modes that longitudinal evidence attributes to AI-written code —
 * duplication instead of reuse, refactoring collapsing into copying, constructs that
 * mask errors — are all **legal in import terms**, so no import rule can see them.
 * This module is where they become numbers.
 *
 * Three commitments, in order of importance:
 *
 * 1. **A measurement, not a resemblance.** Duplication here is EXACT equality of a
 *    normalized syntax-node fingerprint (`SymbolFact.structuralHash`), which is an
 *    equivalence relation — the classic Type-2 clone. It is emphatically NOT a token
 *    similarity score with a threshold, because a threshold nobody calibrated is the
 *    exact failure GT-584 exists to prevent, and a metric that needs one is a knob
 *    dressed as a fact. What that buys in defensibility it pays for in recall, and
 *    every measurement below states what it cannot see, in `blindSpots`.
 *
 * 2. **The imputation is a guess even when the count is not.** Counting two identical
 *    bodies is arithmetic; concluding "duplication instead of reuse" is an inference,
 *    and generated code, exhaustive switch arms and framework boilerplate are all
 *    structurally identical for legitimate reasons. So every signal is emitted as
 *    `determinism: 'probabilistic'` with NO `calibration`, converted to canonical
 *    `Evidence` and passed through {@link admitEvidenceBlocking} — the GT-584 gate,
 *    not around it. Uncalibrated ⇒ `advisory-uncalibrated` ⇒ `blocking: false`.
 *    Nothing here can fail a merge until somebody measures its error rate.
 *
 * 3. **Purity, so a delta means something.** Every function is total and pure over
 *    `RepoFacts`: same facts in, same numbers out, no clock, no filesystem, no
 *    indexer (ADR-0101). Combined with GT-589's content-hashed reproducibility, that
 *    is what makes {@link diffDriftSignalReports} a statement about the repository
 *    between two revisions rather than about the machine that ran the tool.
 */

import type { Evidence, EvidenceAdmissibilityDecision, EvidenceFinding } from './quality-evidence';
import { admitEvidenceBlocking } from './quality-evidence';
import { DEFAULT_MIN_STRUCTURAL_SIZE } from './repo-facts';
import type { ErrorMaskingKind, RepoFacts, SymbolFact } from './repo-facts';

/** Producer label carried on every emitted piece of {@link Evidence}. */
export const DRIFT_SIGNAL_SOURCE = 'evolith-drift-signals';

/** Quality dimension these signals report under (opaque to the Core, per ADR-0111). */
export const DRIFT_SIGNAL_DIMENSION = 'code-quality';

/** Version of the computations in this module, echoed as `adapterVersion`. */
export const DRIFT_SIGNALS_VERSION = '1.0.0';

/** The three signals GT-594 asks for. */
export type DriftSignalId = 'duplication' | 'refactor-to-copy' | 'error-masking';

export const DRIFT_SIGNAL_IDS: readonly DriftSignalId[] = [
  'duplication',
  'error-masking',
  'refactor-to-copy',
];

/**
 * Where a number came from. Distinct from `Provenance` on `Evidence` (which this is
 * projected onto) because a drift signal has TWO possible inputs — one fact base, or
 * two — and a delta with only one hash is unauditable.
 */
export interface DriftSignalProvenance {
  readonly computedBy: string;
  readonly version: string;
  readonly factsSchemaVersion: string;
  readonly indexer: string;
  readonly indexerVersion: string;
  /** Content hash of the fact base measured (the CURRENT one, for a two-revision signal). */
  readonly contentHash: string;
  /** Revision the facts were extracted from, when the extractor knew it. */
  readonly revision?: string;
  /** Content hash of the baseline fact base — present only for a two-revision signal. */
  readonly baselineContentHash?: string;
  readonly baselineRevision?: string;
}

/** One concrete thing the signal saw, so a number can be traced to code. */
export interface DriftObservation {
  /** Stable, signal-scoped code (e.g. 'clone-class', 'copied-declaration'). */
  readonly code: string;
  readonly message: string;
  /** Module or symbol the observation points at. */
  readonly location?: string;
}

/** Whether a signal could be computed at all over the facts it was given. */
export type DriftSignalStatus = 'measured' | 'not-measurable';

/** One drift signal, measured. */
export interface DriftSignalMeasurement {
  readonly signal: DriftSignalId;
  readonly status: DriftSignalStatus;
  /** Set when `status === 'not-measurable'` — absent data is never reported as zero. */
  readonly notMeasurableReason?: string;
  /** The exact numbers. Every key is explained by {@link definition}. */
  readonly metrics: Readonly<Record<string, number>>;
  readonly observations: readonly DriftObservation[];
  /** What the numbers mean, stated precisely enough to be disputed. */
  readonly definition: string;
  /** What this measurement CANNOT see. Never empty — an unstated blind spot is a lie. */
  readonly blindSpots: readonly string[];
  readonly provenance: DriftSignalProvenance;
}

/** A measurement, the canonical evidence it becomes, and what GT-584 said about it. */
export interface DriftSignalAssessment {
  readonly measurement: DriftSignalMeasurement;
  readonly evidence: Evidence;
  readonly admissibility: EvidenceAdmissibilityDecision;
}

/** The full advisory report the architecture evaluator publishes. */
export interface DriftSignalReport {
  readonly signals: readonly DriftSignalAssessment[];
  /**
   * Signals that MAY contribute to a blocking verdict. Empty while no drift signal
   * carries a measured error rate — which is the state GT-594's second criterion
   * describes, and GT-585 is the row that ends it.
   */
  readonly blockingAdmissible: readonly DriftSignalId[];
  /** Content hash of the facts measured — the NAME of the input this report judged. */
  readonly contentHash: string;
  readonly baselineContentHash?: string;
}

// ---------------------------------------------------------------------------
// Shared helpers (pure)
// ---------------------------------------------------------------------------

const byString = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

const ratio = (numerator: number, denominator: number): number =>
  denominator === 0 ? 0 : numerator / denominator;

function provenanceOf(facts: RepoFacts, baseline?: RepoFacts): DriftSignalProvenance {
  return {
    computedBy: DRIFT_SIGNAL_SOURCE,
    version: DRIFT_SIGNALS_VERSION,
    factsSchemaVersion: facts.schemaVersion,
    indexer: facts.provenance.indexer,
    indexerVersion: facts.provenance.indexerVersion,
    contentHash: facts.contentHash,
    ...(facts.provenance.revision ? { revision: facts.provenance.revision } : {}),
    ...(baseline ? { baselineContentHash: baseline.contentHash } : {}),
    ...(baseline?.provenance.revision ? { baselineRevision: baseline.provenance.revision } : {}),
  };
}

/** Declarations the extractor fingerprinted, at or above the floor, in stable order. */
function fingerprinted(facts: RepoFacts, minStructuralSize: number): SymbolFact[] {
  return facts.symbols
    .filter((s) => typeof s.structuralHash === 'string' && (s.structuralSize ?? 0) >= minStructuralSize)
    .sort((a, b) => byString(a.id, b.id));
}

// ---------------------------------------------------------------------------
// Signal 1 — duplication
// ---------------------------------------------------------------------------

/** One set of declarations that share a structural fingerprint. */
export interface CloneClass {
  readonly structuralHash: string;
  /** Symbol ids in the class, sorted. Length ≥ 2 by construction. */
  readonly members: readonly string[];
  /** Distinct modules the class spans, sorted. */
  readonly modules: readonly string[];
  /** Normalized syntax-node count the fingerprint covers. */
  readonly structuralSize: number;
}

export interface DuplicationOptions {
  /**
   * Floor, in normalized syntax nodes, below which a declaration is excluded.
   * Defaults to {@link DEFAULT_MIN_STRUCTURAL_SIZE} — the same constant the
   * extractor fingerprints against, so the population is one population.
   */
  readonly minStructuralSize?: number;
}

/**
 * Every clone class in the fact base. Pure and deterministic: classes are ordered by
 * fingerprint, members within a class by symbol id.
 */
export function findCloneClasses(
  facts: RepoFacts,
  options: DuplicationOptions = {},
): readonly CloneClass[] {
  const floor = options.minStructuralSize ?? DEFAULT_MIN_STRUCTURAL_SIZE;
  const byHash = new Map<string, SymbolFact[]>();
  for (const symbol of fingerprinted(facts, floor)) {
    const hash = symbol.structuralHash as string;
    const bucket = byHash.get(hash);
    if (bucket) bucket.push(symbol);
    else byHash.set(hash, [symbol]);
  }

  const classes: CloneClass[] = [];
  for (const [structuralHash, members] of byHash) {
    if (members.length < 2) continue;
    classes.push({
      structuralHash,
      members: members.map((m) => m.id).sort(byString),
      modules: [...new Set(members.map((m) => m.moduleId))].sort(byString),
      structuralSize: members[0].structuralSize ?? 0,
    });
  }
  return classes.sort((a, b) => byString(a.structuralHash, b.structuralHash));
}

const DUPLICATION_DEFINITION =
  'Two declarations are DUPLICATES iff their normalized syntax-node fingerprints are ' +
  'EQUAL — the ordered sequence of syntax kinds of the declaration subtree with every ' +
  'identifier, literal, comment and piece of trivia erased. That is the classic Type-2 ' +
  'clone relation (identical modulo renaming), and it is an equivalence relation, not a ' +
  'similarity score: there is no threshold to tune. A CLONE CLASS is a maximal set of two ' +
  'or more such declarations. Only declarations with a body (function-like and class ' +
  'declarations) at or above the node floor are fingerprinted at all. ' +
  'duplicationRatio = clonedDeclarations / fingerprintedDeclarations, in [0,1]. ' +
  'redundantDeclarations = the sum over classes of (size - 1): how many declarations could ' +
  'in principle collapse into one, if collapsing were appropriate — which this does not judge.';

const DUPLICATION_BLIND_SPOTS: readonly string[] = [
  'Type-3 clones: a copy with a single inserted, deleted or modified statement has a different fingerprint and is invisible here. Exactness is bought at the cost of recall, and this is the bill.',
  'Type-4 clones: two implementations of the same behaviour with different structure are not duplicates by this definition, and never will be.',
  'Duplication BELOW the declaration: a block repeated three times inside one function is one declaration and contributes nothing.',
  'Duplication below the node floor, and any declaration the extractor chose not to fingerprint (types, interfaces, plain constants).',
  'Anything the indexer did not parse: this reads TypeScript only, so duplication in other languages, in configuration, in SQL or in generated artifacts is not counted.',
  'Legitimacy: generated code, exhaustive switch arms, test fixtures, parallel adapters implementing one port and framework-mandated boilerplate are all structurally identical for good reasons. The metric measures structural identity; it does NOT measure whether reuse was the right call.',
  'Attribution: nothing here can tell whether a human or a model wrote the copy.',
];

/** Duplication over one fact base. */
export function measureDuplication(
  facts: RepoFacts,
  options: DuplicationOptions = {},
): DriftSignalMeasurement {
  const floor = options.minStructuralSize ?? DEFAULT_MIN_STRUCTURAL_SIZE;
  const provenance = provenanceOf(facts);
  const population = fingerprinted(facts, floor);

  if (facts.symbols.every((s) => s.structuralHash === undefined)) {
    return {
      signal: 'duplication',
      status: 'not-measurable',
      notMeasurableReason:
        'No symbol in this fact base carries a structuralHash. The extractor did not fingerprint ' +
        'declarations (schema < 1.1.0, or an indexer with no such pass), and "not fingerprinted" ' +
        'is not the same as "not duplicated" — so no ratio is reported rather than a false zero.',
      metrics: {},
      observations: [],
      definition: DUPLICATION_DEFINITION,
      blindSpots: DUPLICATION_BLIND_SPOTS,
      provenance,
    };
  }

  const classes = findCloneClasses(facts, { minStructuralSize: floor });
  const clonedDeclarations = classes.reduce((n, c) => n + c.members.length, 0);
  const redundantDeclarations = classes.reduce((n, c) => n + c.members.length - 1, 0);
  const crossModuleCloneClasses = classes.filter((c) => c.modules.length > 1).length;
  const largestCloneClass = classes.reduce((n, c) => Math.max(n, c.members.length), 0);

  return {
    signal: 'duplication',
    status: 'measured',
    metrics: {
      minStructuralSize: floor,
      declarations: facts.symbols.length,
      fingerprintedDeclarations: population.length,
      cloneClasses: classes.length,
      clonedDeclarations,
      redundantDeclarations,
      crossModuleCloneClasses,
      largestCloneClass,
      duplicationRatio: ratio(clonedDeclarations, population.length),
    },
    observations: classes.map((c) => ({
      code: 'clone-class',
      message:
        c.members.length + ' declarations share one fingerprint (' + c.structuralSize +
        ' normalized nodes) across ' + c.modules.length + ' module(s): ' + c.members.join(', ') + '.',
      location: c.modules[0],
    })),
    definition: DUPLICATION_DEFINITION,
    blindSpots: DUPLICATION_BLIND_SPOTS,
    provenance,
  };
}

// ---------------------------------------------------------------------------
// Signal 2 — error-masking constructs
// ---------------------------------------------------------------------------

const SWALLOWED_ERROR_KINDS: readonly ErrorMaskingKind[] = [
  'empty-catch',
  'catch-discards-error',
  'promise-catch-swallow',
];

const SUPPRESSED_DIAGNOSTIC_KINDS: readonly ErrorMaskingKind[] = [
  'ts-directive-suppression',
  'any-assertion',
  'non-null-assertion',
];

const ERROR_MASKING_DEFINITION =
  'A count of occurrences of a CLOSED, purely syntactic list of constructs that prevent an ' +
  'error from being observed, in two families. SWALLOWED RUNTIME ERROR: empty-catch (a catch ' +
  'clause with no statements), catch-discards-error (a catch clause whose caught value is never ' +
  'read and which rethrows nothing), promise-catch-swallow (a .catch handler that neither reads ' +
  'the rejection nor throws). SUPPRESSED DIAGNOSTIC: ts-directive-suppression (@ts-ignore / ' +
  '@ts-expect-error), any-assertion (`as any` / `<any>`), non-null-assertion (`x!`). ' +
  'errorMaskingDensityPerModule = errorMaskingConstructs / modules. Each occurrence is decidable ' +
  'from the shape of the code alone, so the count is arithmetic; whether an occurrence is WRONG ' +
  'is a judgement this does not make.';

const ERROR_MASKING_BLIND_SPOTS: readonly string[] = [
  'Masking by logic rather than by syntax: `if (err) return null;`, a catch that logs and continues, a default value returned on failure, a retry loop that gives up silently. None of these appear in the list and none are counted.',
  'Suppression outside TypeScript source: `eslint-disable` comments, a lenient tsconfig (`strict: false`, `noImplicitAny: false`), a CI step with `|| true`, a swallowed non-zero exit. The most consequential masker in a repository is often a configuration file this never opens.',
  'Justification: an `@ts-expect-error` on a known upstream typing bug and one hiding a real defect are the same fact here. Occurrence counts do not distinguish a documented, narrow suppression from a lazy one.',
  'Structural equivalents the indexer does not model: a catch that assigns the error to an unused variable through destructuring, or a handler passed by reference rather than written inline.',
  'Attribution: nothing here can tell whether a human or a model wrote the construct.',
];

/** Error-masking constructs over one fact base. */
export function measureErrorMasking(facts: RepoFacts): DriftSignalMeasurement {
  const provenance = provenanceOf(facts);

  if (facts.errorMasking === undefined) {
    return {
      signal: 'error-masking',
      status: 'not-measurable',
      notMeasurableReason:
        'This fact base carries no errorMasking collection at all. The extractor did not run the ' +
        'pass (schema < 1.1.0, or an indexer without one). An absent collection is reported as ' +
        'not-measurable rather than as zero, because "nobody looked" and "there are none" are ' +
        'different claims and only one of them is good news.',
      metrics: {},
      observations: [],
      definition: ERROR_MASKING_DEFINITION,
      blindSpots: ERROR_MASKING_BLIND_SPOTS,
      provenance,
    };
  }

  const occurrences = facts.errorMasking;
  const countOf = (kind: ErrorMaskingKind): number =>
    occurrences.filter((o) => o.kind === kind).length;

  const swallowedErrors = occurrences.filter((o) => SWALLOWED_ERROR_KINDS.includes(o.kind)).length;
  const suppressedDiagnostics = occurrences.filter((o) =>
    SUPPRESSED_DIAGNOSTIC_KINDS.includes(o.kind),
  ).length;
  const modulesWithMasking = new Set(occurrences.map((o) => o.moduleId)).size;

  return {
    signal: 'error-masking',
    status: 'measured',
    metrics: {
      modules: facts.modules.length,
      errorMaskingConstructs: occurrences.length,
      swallowedErrors,
      suppressedDiagnostics,
      emptyCatch: countOf('empty-catch'),
      catchDiscardsError: countOf('catch-discards-error'),
      promiseCatchSwallow: countOf('promise-catch-swallow'),
      tsDirectiveSuppression: countOf('ts-directive-suppression'),
      anyAssertion: countOf('any-assertion'),
      nonNullAssertion: countOf('non-null-assertion'),
      modulesWithMasking,
      errorMaskingDensityPerModule: ratio(occurrences.length, facts.modules.length),
    },
    observations: [...occurrences]
      .sort(
        (a, b) => byString(a.moduleId, b.moduleId) || a.line - b.line || byString(a.kind, b.kind),
      )
      .map((o) => ({
        code: o.kind,
        message:
          o.kind + ' at ' + o.moduleId + ':' + o.line +
          (o.symbolId ? ' (in ' + o.symbolId + ')' : '') + '.',
        location: o.moduleId + ':' + o.line,
      })),
    definition: ERROR_MASKING_DEFINITION,
    blindSpots: ERROR_MASKING_BLIND_SPOTS,
    provenance,
  };
}

// ---------------------------------------------------------------------------
// Signal 3 — refactor-to-copy (a two-revision signal by nature)
// ---------------------------------------------------------------------------

const REFACTOR_TO_COPY_DEFINITION =
  'Computed over TWO fact bases of the same repository. Let ADDED be the fingerprinted ' +
  'declarations present in the current revision and absent from the baseline BY SYMBOL ID, and ' +
  'REMOVED the converse. MOVED (refactoring evidence) = added declarations matched one-to-one, in ' +
  'sorted order, against removed declarations carrying the SAME fingerprint: the body survived and ' +
  'its home did not, i.e. a relocation or a rename. COPIED (copying evidence) = added declarations ' +
  'not matched as moved whose fingerprint already existed in the baseline: the body was reproduced ' +
  'while an instance of it persisted. NOVEL = added declarations whose fingerprint is new to the ' +
  'repository. refactorShare = moved / (moved + copied), in [0,1], reported only when that ' +
  'denominator is non-zero; refactorToCopyRatio = moved / copied, reported only when copied > 0.';

const REFACTOR_TO_COPY_BLIND_SPOTS: readonly string[] = [
  'Every refactoring that CHANGES a body — extract-method, a signature change, an inlined helper, a renamed parameter that alters arity — produces a new fingerprint and is classified NOVEL, not MOVED. This metric sees only the pure-relocation kind of refactoring, so it systematically under-counts refactoring.',
  'Symmetrically, a copy that was edited on arrival is also NOVEL, so copying is under-counted too. The ratio is therefore a ratio of the two EXACT-body populations, not of all refactoring to all copying.',
  'The one-to-one matching between added and removed declarations sharing a fingerprint is arbitrary when several compete; it is made deterministic by sorting on symbol id, which is a tie-break, not a truth.',
  'Intent: vendoring, a deliberate fork of an algorithm that is about to diverge, and a lazy paste are the same fact here.',
  'Comparability: two fact bases produced by different extractor or indexer versions are refused rather than compared, because the fingerprint function itself may differ.',
  'Attribution: nothing here can tell whether a human or a model made the change.',
];

const notComparable = (
  facts: RepoFacts,
  baseline: RepoFacts,
  reason: string,
): DriftSignalMeasurement => ({
  signal: 'refactor-to-copy',
  status: 'not-measurable',
  notMeasurableReason: reason,
  metrics: {},
  observations: [],
  definition: REFACTOR_TO_COPY_DEFINITION,
  blindSpots: REFACTOR_TO_COPY_BLIND_SPOTS,
  provenance: provenanceOf(facts, baseline),
});

/**
 * Why two fact bases may not be compared, or `undefined` when they may.
 *
 * Exported because the same check guards the delta report: a number computed over a
 * fingerprint function that changed between revisions is not a change in the
 * repository, it is a change in the instrument.
 */
export function incomparabilityReason(baseline: RepoFacts, current: RepoFacts): string | undefined {
  if (baseline.schemaVersion !== current.schemaVersion) {
    return (
      'Fact bases declare different schema versions (' + baseline.schemaVersion + ' vs ' +
      current.schemaVersion + '). The canonical form differs, so the two are not measurements of the same kind.'
    );
  }
  if (
    baseline.provenance.indexer !== current.provenance.indexer ||
    baseline.provenance.indexerVersion !== current.provenance.indexerVersion
  ) {
    return (
      'Fact bases were produced by different indexers (' + baseline.provenance.indexer + '@' +
      baseline.provenance.indexerVersion + ' vs ' + current.provenance.indexer + '@' +
      current.provenance.indexerVersion + '). A difference between them may be a difference in the instrument.'
    );
  }
  return undefined;
}

export interface RefactorToCopyOptions extends DuplicationOptions {}

/** The refactor:copy signal between a baseline and a current fact base. */
export function measureRefactorToCopy(
  baseline: RepoFacts,
  current: RepoFacts,
  options: RefactorToCopyOptions = {},
): DriftSignalMeasurement {
  const incomparable = incomparabilityReason(baseline, current);
  if (incomparable) return notComparable(current, baseline, incomparable);

  const floor = options.minStructuralSize ?? DEFAULT_MIN_STRUCTURAL_SIZE;
  const before = fingerprinted(baseline, floor);
  const after = fingerprinted(current, floor);

  if (before.length === 0 && after.length === 0) {
    return notComparable(
      current,
      baseline,
      'Neither fact base carries a fingerprinted declaration at or above the node floor (' + floor +
        '), so no body can be traced from one revision to the other.',
    );
  }

  const beforeById = new Map(before.map((s) => [s.id, s]));
  const afterIds = new Set(after.map((s) => s.id));
  const added = after.filter((s) => !beforeById.has(s.id));
  const removed = before.filter((s) => !afterIds.has(s.id));
  const survivingHashes = new Set(
    before.filter((s) => afterIds.has(s.id)).map((s) => s.structuralHash as string),
  );

  // One-to-one consumption of removed declarations by fingerprint. Deterministic:
  // both lists are already sorted by symbol id, so the pairing is reproducible.
  const removedByHash = new Map<string, string[]>();
  for (const symbol of removed) {
    const hash = symbol.structuralHash as string;
    const bucket = removedByHash.get(hash);
    if (bucket) bucket.push(symbol.id);
    else removedByHash.set(hash, [symbol.id]);
  }

  const observations: DriftObservation[] = [];
  let moved = 0;
  let copied = 0;
  let novel = 0;

  for (const symbol of added) {
    const hash = symbol.structuralHash as string;
    const candidates = removedByHash.get(hash);
    if (candidates && candidates.length > 0) {
      const origin = candidates.shift() as string;
      moved += 1;
      observations.push({
        code: 'moved-declaration',
        message: 'Body preserved, home changed: ' + origin + ' → ' + symbol.id + '.',
        location: symbol.moduleId,
      });
      continue;
    }
    if (survivingHashes.has(hash)) {
      copied += 1;
      observations.push({
        code: 'copied-declaration',
        message:
          'New declaration ' + symbol.id + ' reproduces a body that still exists elsewhere in this revision.',
        location: symbol.moduleId,
      });
      continue;
    }
    novel += 1;
  }

  const comparable = moved + copied;
  return {
    signal: 'refactor-to-copy',
    status: 'measured',
    metrics: {
      minStructuralSize: floor,
      baselineFingerprintedDeclarations: before.length,
      currentFingerprintedDeclarations: after.length,
      addedDeclarations: added.length,
      removedDeclarations: removed.length,
      movedDeclarations: moved,
      copiedDeclarations: copied,
      novelDeclarations: novel,
      ...(comparable > 0 ? { refactorShare: ratio(moved, comparable) } : {}),
      ...(copied > 0 ? { refactorToCopyRatio: ratio(moved, copied) } : {}),
    },
    observations,
    definition: REFACTOR_TO_COPY_DEFINITION,
    blindSpots: REFACTOR_TO_COPY_BLIND_SPOTS,
    provenance: provenanceOf(current, baseline),
  };
}

// ---------------------------------------------------------------------------
// The GT-584 gate — every signal goes THROUGH it, never around it
// ---------------------------------------------------------------------------

/**
 * Project a measurement onto the canonical {@link Evidence} model.
 *
 * `determinism: 'probabilistic'` and NO `calibration`, deliberately and for a reason
 * worth stating: the COUNT is exact (fingerprint equality is arithmetic), but the
 * INFERENCE the count is used for — "this is duplication instead of reuse", "this
 * error masking is a defect" — is not. `admitEvidenceBlocking` therefore returns
 * `advisory-uncalibrated`, and no drift signal can reach a blocking verdict until
 * somebody measures its true-positive and true-negative rates over a labelled corpus
 * (GT-585). Calling the count "deterministic" would have let the inference block on
 * the strength of the arithmetic, which is exactly the substitution GT-584 forbids.
 *
 * `observedAt` is an EXPLICIT parameter, and defaults to the empty string, for a
 * reason GT-589's own end-to-end guard proved: echoing `RepoFacts.provenance.
 * extractedAt` into the result made two extractions of the SAME tree produce
 * different verdicts, which is exactly the non-determinism `canonicalizeRepoFacts`
 * removes by excluding that timestamp from the canonical form. A verdict must be a
 * function of the code, not of the clock. So no collection instant is asserted by
 * default: the extraction instant already lives on `RepoFacts.provenance` where the
 * consumer put it, `contentHash` is what NAMES the judged input, and a caller
 * forwarding this evidence outward — into a store, a policy engine, an audit log —
 * passes the instant it wants stamped. `admitEvidenceBlocking` never reads it.
 */
export function toEvidence(measurement: DriftSignalMeasurement, observedAt = ''): Evidence {
  const findings: EvidenceFinding[] = measurement.observations.map((o) => ({
    code: o.code,
    severity: 'info',
    message: o.message,
    ...(o.location ? { location: o.location } : {}),
  }));

  return {
    source: DRIFT_SIGNAL_SOURCE,
    dimension: DRIFT_SIGNAL_DIMENSION,
    metrics: measurement.metrics,
    findings,
    determinism: 'probabilistic',
    provenance: {
      collectedBy: DRIFT_SIGNAL_SOURCE + '/' + measurement.signal,
      adapterVersion: DRIFT_SIGNALS_VERSION,
      artifactHash: measurement.provenance.contentHash,
      timestamp: observedAt,
    },
  };
}

/** A measurement plus the GT-584 verdict on whether it may block. */
export function assessDriftSignal(
  measurement: DriftSignalMeasurement,
  observedAt = '',
): DriftSignalAssessment {
  const evidence = toEvidence(measurement, observedAt);
  return { measurement, evidence, admissibility: admitEvidenceBlocking(evidence) };
}

export interface DriftSignalOptions extends DuplicationOptions {
  /** Baseline fact base for the two-revision signal. Absent ⇒ refactor:copy is not measurable. */
  readonly baseline?: RepoFacts;
  /**
   * Collection instant to stamp on the emitted `Evidence`. Omitted by design in the
   * evaluation path: a verdict that repeats the extraction clock stops being a
   * function of the code (see {@link toEvidence}).
   */
  readonly observedAt?: string;
}

/**
 * Compute every drift signal over a fact base (and, when a baseline is supplied, the
 * two-revision one). Pure and total: no clock, no filesystem, no indexer. Signals are
 * emitted in {@link DRIFT_SIGNAL_IDS} order so two runs agree.
 *
 * Stronger than "two runs agree": two fact bases with the same `contentHash` produce
 * DEEP-EQUAL reports, because nothing here reads anything outside the structure — not
 * even the extraction instant. That equality is what makes the conformance delta a
 * statement about the repository, and it is asserted in the spec.
 */
export function summarizeDriftSignals(
  facts: RepoFacts,
  options: DriftSignalOptions = {},
): DriftSignalReport {
  const duplication = measureDuplication(facts, options);
  const errorMasking = measureErrorMasking(facts);
  const refactorToCopy = options.baseline
    ? measureRefactorToCopy(options.baseline, facts, options)
    : ({
        signal: 'refactor-to-copy',
        status: 'not-measurable',
        notMeasurableReason:
          'No baseline fact base was supplied. refactor:copy is a statement about a repository ' +
          'BETWEEN two revisions and cannot be computed from one; the Core holds nothing between ' +
          'evaluations (ADR-0101), so the consumer delivers both fact bases inline or gets no signal.',
        metrics: {},
        observations: [],
        definition: REFACTOR_TO_COPY_DEFINITION,
        blindSpots: REFACTOR_TO_COPY_BLIND_SPOTS,
        provenance: provenanceOf(facts),
      } satisfies DriftSignalMeasurement);

  const signals = [duplication, errorMasking, refactorToCopy]
    .sort((a, b) => DRIFT_SIGNAL_IDS.indexOf(a.signal) - DRIFT_SIGNAL_IDS.indexOf(b.signal))
    .map((measurement) => assessDriftSignal(measurement, options.observedAt ?? ''));

  return {
    signals,
    blockingAdmissible: signals.filter((s) => s.admissibility.blocking).map((s) => s.measurement.signal),
    contentHash: facts.contentHash,
    ...(options.baseline ? { baselineContentHash: options.baseline.contentHash } : {}),
  };
}

// ---------------------------------------------------------------------------
// Criterion 3 — a conformance delta over the same repository, per signal
// ---------------------------------------------------------------------------

export interface DriftMetricDelta {
  readonly metric: string;
  /** Value in the baseline report. Absent when the metric is new. */
  readonly before?: number;
  /** Value in the current report. Absent when the metric disappeared. */
  readonly after?: number;
  /** `after - before`, present only when both sides carry the metric. */
  readonly delta?: number;
}

export interface DriftSignalDelta {
  readonly signal: DriftSignalId;
  readonly status: 'comparable' | 'incomparable';
  readonly incomparableReason?: string;
  readonly baselineContentHash: string;
  readonly currentContentHash: string;
  readonly metrics: readonly DriftMetricDelta[];
}

/** The per-signal conformance delta between two reports of the same repository. */
export interface DriftConformanceDelta {
  readonly baselineContentHash: string;
  readonly currentContentHash: string;
  /** True when the two reports name the same input — every delta is then zero. */
  readonly sameInput: boolean;
  readonly signals: readonly DriftSignalDelta[];
}

/**
 * Report, per signal, how the repository moved between two revisions.
 *
 * This is the criterion-3 surface, and it rests on GT-589's reproducibility: the
 * measurements are pure functions of a content-hashed value, so a non-zero delta is a
 * change in the repository and not in the run. Two reports over the SAME
 * `contentHash` are guaranteed to produce all-zero deltas — asserted in the spec, and
 * the reason `sameInput` is published rather than inferred.
 *
 * A signal that was `not-measurable` on either side is reported `incomparable` with
 * its reason instead of being silently treated as zero.
 */
export function diffDriftSignalReports(
  baseline: DriftSignalReport,
  current: DriftSignalReport,
): DriftConformanceDelta {
  const baselineBySignal = new Map(baseline.signals.map((s) => [s.measurement.signal, s.measurement]));
  const signals: DriftSignalDelta[] = [];

  for (const id of DRIFT_SIGNAL_IDS) {
    const before = baselineBySignal.get(id);
    const after = current.signals.find((s) => s.measurement.signal === id)?.measurement;

    const shell = {
      signal: id,
      baselineContentHash: baseline.contentHash,
      currentContentHash: current.contentHash,
    };

    if (!before || !after) {
      signals.push({
        ...shell,
        status: 'incomparable',
        incomparableReason: 'Signal absent from ' + (before ? 'the current' : 'the baseline') + ' report.',
        metrics: [],
      });
      continue;
    }
    if (before.status !== 'measured' || after.status !== 'measured') {
      const unmeasured = before.status !== 'measured' ? before : after;
      signals.push({
        ...shell,
        status: 'incomparable',
        incomparableReason:
          'Not measured on ' + (before.status !== 'measured' ? 'the baseline' : 'the current') +
          ' side: ' + (unmeasured.notMeasurableReason ?? 'no reason recorded') +
          ' A missing measurement is not a zero.',
        metrics: [],
      });
      continue;
    }

    const keys = [...new Set([...Object.keys(before.metrics), ...Object.keys(after.metrics)])].sort(
      byString,
    );
    signals.push({
      ...shell,
      status: 'comparable',
      metrics: keys.map((metric) => {
        const b = before.metrics[metric];
        const a = after.metrics[metric];
        return {
          metric,
          ...(b === undefined ? {} : { before: b }),
          ...(a === undefined ? {} : { after: a }),
          ...(b === undefined || a === undefined ? {} : { delta: a - b }),
        };
      }),
    });
  }

  return {
    baselineContentHash: baseline.contentHash,
    currentContentHash: current.contentHash,
    sameInput: baseline.contentHash === current.contentHash,
    signals,
  };
}
