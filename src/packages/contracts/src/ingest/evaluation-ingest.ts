/**
 * GT-604 — ONE ingest contract for depositing a Core verdict in the Tracker,
 * published where BOTH sides can reach it.
 *
 * The state this addresses
 * -----------------------
 * The evidence write path is one-directional and points INWARD. Grep across
 * `src/sdk/cli`, `src/packages/mcp-server` and `src/packages/core-domain`
 * returns no Tracker base URL and no ingest client; the only Tracker URL in this
 * repository is `AGENT_RUNTIME_APPROVAL_TRACKER_URL`, and the only writers of
 * `core_evaluation_transactions` are Tracker-initiated endpoints. So every
 * `evolith evaluate`, every `enforce edit` veto, every MCP `tools/call` and every
 * CI drift-gate run produces a complete, owner-attributed, engine-attributed
 * verdict and then evaporates on process exit.
 *
 * This module is the FIRST of the three things that gap needs — the contract.
 * The other two are explicitly NOT here:
 *
 *  - the shared HTTP client is not built, because there is no endpoint to call:
 *    the Tracker exposes `GET /core-evaluation-transactions` and
 *    `GET /core-evaluation-transactions/{id}` and no Core-initiated write route.
 *    A client written against a route that does not exist is not a client, it is
 *    a mock with a network stack;
 *  - the RoboSoft robot that asserts a CLI evaluation lands as a persisted row
 *    lives in `beyondnetcode/evolith_tracker` and cannot be written from here.
 *
 * What this module is
 * -------------------
 * The wire shape, as plain data and pure functions with NO imports and NO I/O,
 * so the producing surfaces and the consuming Tracker converge on one payload
 * instead of on two similar-looking mappers. It publishes:
 *
 *  1. {@link EvaluationIngestPayload} — the body, carrying the five things the
 *     gap's first acceptance criterion names: `correlationId`, the TRUE engine
 *     per executed rule, the executed rules, the violations, and the owner —
 *     which is really TWO owners, see below.
 *  2. {@link EVALUATION_INGEST_FIELD_SOURCES} — the derivation map: for every
 *     wire field, the exact path on `EvaluationResult` / `Violation` it comes
 *     from. This is what makes the contract DERIVED rather than restated: a
 *     rename on either source type stops one of these paths resolving, and
 *     `evaluation-ingest.spec.ts` walks all of them against objects produced by
 *     the real `@beyondnet/evolith-core-domain` pipeline.
 *  3. {@link toEvaluationIngestPayload} — the mapper, and
 *     {@link resolveIngestCorrelationId}, the boundary synthesis that makes
 *     `correlationId` REQUIRED on the wire even though it is optional upstream.
 *  4. {@link checkEvaluationIngestPayload} — the consumer-driven oracle, so the
 *     Tracker can assert a received body against this contract in its own tests
 *     rather than against a C# DTO that drifted.
 *  5. {@link EVALUATION_INGEST_ENDPOINT_CONTRACT} — the route, the machine-key
 *     authentication and the idempotency rule the Tracker must implement.
 *
 * Why the contract is import-free
 * -------------------------------
 * `@beyondnet/evolith-core-domain` is a devDependency of this package, and
 * deliberately so: the whole point of `@beyondnet/evolith-contracts` is that an
 * external consumer depends on the CONTRACT and not on the engine. A `import
 * type { EvaluationResult }` here would leak into the published
 * `dist/ingest/evaluation-ingest.d.ts`, where a consumer without core-domain
 * installed resolves it to `any` under the usual `skipLibCheck: true` — silently
 * turning the entire payload type into `any`, which is strictly worse for a wire
 * contract than restating it. The derivation is therefore enforced by
 * {@link EVALUATION_INGEST_FIELD_SOURCES} plus the spec that walks it, which is
 * checked at RUNTIME and so survives this package's `diagnostics: false` ts-jest
 * configuration. Same discipline as `evidence/evidence-edge.ts` (GT-605) and
 * `fixtures/evaluation-contract.fixtures.ts` (GT-573).
 *
 * Scope boundary: the `POST` route, its machine-key handler, the
 * `core_evaluation_transactions` write and the RoboSoft robot live in
 * `beyondnetcode/evolith_tracker`. Nothing here builds them; everything here is
 * what they must conform to. See
 * `reference/core/control-center/opportunities/tracker-handover-gt604.md`.
 */

// ---------------------------------------------------------------------------
// Version
// ---------------------------------------------------------------------------

/**
 * Schema version of THIS payload, bumped only on an incompatible change.
 *
 * Distinct from `EVALUATION_RESULT_SCHEMA_VERSION` on purpose: the ingest body
 * is a projection of the result, not the result, and the two can move for
 * different reasons. A consumer pins this one.
 */
export const EVALUATION_INGEST_SCHEMA_VERSION = '1.0.0';

// ---------------------------------------------------------------------------
// Surfaces
// ---------------------------------------------------------------------------

/**
 * The surfaces that produce a verdict and therefore need a deposit path. Every
 * entry is named in the gap's impact statement; `core-api` is added because the
 * REST surface produces the same `EvaluationResult` and would otherwise be the
 * one hole left in the ledger.
 *
 * CLOSED on purpose: `producer.surface` is what a Tracker operator filters the
 * ledger by, and an open string is how that filter becomes useless.
 */
export const EVALUATION_INGEST_SURFACES = Object.freeze([
  'agent-runtime',
  'cli',
  'core-api',
  'drift-gate',
  'mcp',
] as const);

export type EvaluationIngestSurface = (typeof EVALUATION_INGEST_SURFACES)[number];

/** True when `value` is one of the closed {@link EVALUATION_INGEST_SURFACES}. */
export function isEvaluationIngestSurface(value: unknown): value is EvaluationIngestSurface {
  return typeof value === 'string' && (EVALUATION_INGEST_SURFACES as readonly string[]).includes(value);
}

// ---------------------------------------------------------------------------
// Engines — OPEN vocabulary, carried verbatim
// ---------------------------------------------------------------------------

/**
 * The engines `RuleExecutionRef.engine` currently resolves to
 * (`KNOWN_RULE_ENGINES` in core-domain). The vocabulary is OPEN by contract:
 * `enforcer` already covers a growing set of OSS source-analyzers normalized
 * into the canonical `Violation`, and the enum is documented to grow without an
 * incompatible schema bump.
 *
 * The wire therefore types `engine` as `string`, and the mapper carries the
 * value VERBATIM. That is the whole point of "the true engine": a mapper that
 * coerced an unrecognised engine to `native` would write a ledger row claiming a
 * governance rule produced a finding that a policy engine produced, and no
 * consumer could ever detect the substitution. Tolerate, never coerce.
 */
export const KNOWN_INGEST_ENGINES = Object.freeze(['native', 'opa', 'enforcer'] as const);

export type KnownIngestEngine = (typeof KNOWN_INGEST_ENGINES)[number];

/** True for an engine this contract version happens to know. Never a gate. */
export function isKnownIngestEngine(value: unknown): value is KnownIngestEngine {
  return typeof value === 'string' && (KNOWN_INGEST_ENGINES as readonly string[]).includes(value);
}

// ---------------------------------------------------------------------------
// The two owners — named so no reader can confuse them
// ---------------------------------------------------------------------------

/**
 * WHO ASKED for the evaluation.
 *
 * Deliberately named `requestedBy` on the wire rather than `requester`, and
 * carried next to {@link IngestViolation.accountableOwner}, because these are the
 * two owner-shaped fields in this payload and they answer different questions
 * about different people:
 *
 *  - `requestedBy.actorId` — who asked. A human user id, an agent id, a CI job
 *    id. Attribution of the REQUEST.
 *  - `violations[].accountableOwner` — who must fix it. A CODEOWNERS entry
 *    resolved from the offending file. Attribution of the DEFECT.
 *
 * Collapsing them into one `owner` field loses the ability to ask either
 * question: "which agent's verdicts keep failing" and "which team owns the
 * failures" stop being separable. The gap's acceptance criterion says "owner",
 * singular; it is two, and this contract carries both.
 */
export interface IngestRequesterRef {
  /** `human` | `agent` | `service` — the discriminator, verbatim from the result. */
  readonly actorType: string;
  /** Opaque id of the actor: user id, agent id, CI job id, service name. */
  readonly actorId: string;
  /** Model that drove the request, when `actorType` is `agent`. */
  readonly modelRef?: string;
  /** Conversation/run this evaluation belongs to; joins a verdict series. */
  readonly sessionId?: string;
}

// ---------------------------------------------------------------------------
// Payload members
// ---------------------------------------------------------------------------

/** One executed rule, with the engine that actually executed it. */
export interface IngestRuleExecution {
  readonly ruleId: string;
  readonly rulesetRef?: string;
  /**
   * The engine that ran the rule, VERBATIM. Typed `string`, not a union: see
   * {@link KNOWN_INGEST_ENGINES}. Consumers MUST tolerate an unknown value.
   */
  readonly engine: string;
  /** `PASS` | `FAIL` | `WARN` | … — the Core's verdict vocabulary, verbatim. */
  readonly verdict: string;
}

/**
 * One normalized violation, as the Core's canonical `Violation` already models
 * it. `owner` is renamed to `accountableOwner` and nothing else is renamed,
 * because every other name is already unambiguous and a gratuitous rename is a
 * mapping bug waiting to happen.
 */
export interface IngestViolation {
  readonly ruleId: string;
  /** Enforcer tool that produced it (`dependency-cruiser`, `deptrac`, …). */
  readonly tool: string;
  /** Repo-relative path; `''` for a project-level finding. */
  readonly file: string;
  readonly line?: number;
  readonly column?: number;
  /** `error` | `warning` | `info`. */
  readonly severity: string;
  readonly message: string;
  /** ADR the rule traces to, when known. */
  readonly adrRef?: string;
  /**
   * WHO MUST FIX IT — the CODEOWNERS-resolved owner of the offending file.
   * NOT the requester; see {@link IngestRequesterRef}. Absent when no CODEOWNERS
   * rule matched: an unattributed defect is recorded as unattributed, never
   * back-filled with the requester, which would be an invented accusation.
   */
  readonly accountableOwner?: string;
  /** Finding category (`security` routes to the security dimension). */
  readonly category?: string;
  /** Compliance control ids this violation discharges (GT-525). */
  readonly complianceControls?: readonly string[];
  /** Stable identity — the Core's fingerprint, carried through unchanged. */
  readonly fingerprint: string;
  /** Baseline/waiver flag: a frozen violation does not block (GT-517). */
  readonly frozen: boolean;
}

/** WHICH revision the verdict judged. Absent means the producer did not know. */
export interface IngestRepositoryRevision {
  readonly revision: string;
  readonly repositoryRef?: string;
  readonly branch?: string;
  readonly committedAt?: string;
  readonly dirty?: boolean;
}

/** WHICH surface deposited the row, and at which version. */
export interface IngestProducer {
  readonly surface: EvaluationIngestSurface;
  /** Version of the producing surface (`evolith-cli@1.2.0`, `core@1.0.5`). */
  readonly version?: string;
}

// ---------------------------------------------------------------------------
// The payload
// ---------------------------------------------------------------------------

/**
 * The body of `POST {baseUrl}/core-evaluation-transactions`.
 *
 * There is NO `tenantId`. The Tracker derives the tenant from WHICH machine key
 * matched, exactly as it already does for `/runtime-approvals`
 * (`agent-runtime/src/adapters/approval/tracker-approval.http-client.ts`).
 * Accepting a tenant from the body would let any valid key deposit evidence into
 * any tenant's ledger — the precise hole the Tracker's machine-auth handler
 * exists to close. {@link checkEvaluationIngestPayload} reports a `tenantId` key
 * as a contract violation so the mistake cannot be made quietly.
 */
export interface EvaluationIngestPayload {
  /** Pin of {@link EVALUATION_INGEST_SCHEMA_VERSION}. */
  readonly schemaVersion: string;

  /**
   * REQUIRED. The join key for the whole trail.
   *
   * `EvaluationResult.correlationId` is OPTIONAL upstream, and both existing
   * call sites already synthesize one when it is absent
   * (`evaluate.command.ts` → `cli-eval-${evaluatedAt}`, `drift-gate.ts` →
   * `drift-gate:${correlationId ?? evaluatedAt}`). This contract makes it
   * mandatory on the wire and synthesizes at the boundary
   * ({@link resolveIngestCorrelationId}), because a trail you cannot correlate
   * is not a trail — it is a pile of rows. It is also the idempotency key: see
   * {@link EVALUATION_INGEST_ENDPOINT_CONTRACT}.
   */
  readonly correlationId: string;

  /** Which surface deposited this, and at which version. */
  readonly producer: IngestProducer;

  /** ISO-8601 instant the verdict was produced (`EvaluationResult.evaluatedAt`). */
  readonly evaluatedAt: string;

  /** Aggregate verdict, verbatim (`PASS` | `FAIL` | …). */
  readonly overallVerdict: string;
  /** Governance outcome, verbatim (`approved` | `rejected` | …). */
  readonly outcome: string;

  /**
   * WHO ASKED. Absent when the producing surface declared no requester — the
   * Core never infers an actor, and neither does this mapper.
   */
  readonly requestedBy?: IngestRequesterRef;

  /** WHICH revision was judged. Absent means unknown, never a placeholder. */
  readonly repositoryRevision?: IngestRepositoryRevision;

  /** Every rule that executed, each with the engine that truly ran it. */
  readonly rulesExecuted: readonly IngestRuleExecution[];

  /** Every normalized violation, each with its accountable owner. */
  readonly violations: readonly IngestViolation[];

  /**
   * Distinct, sorted {@link IngestViolation.accountableOwner} values present in
   * `violations`. Derived, never independent: it exists so the Tracker can index
   * and route by owner without opening the jsonb, and
   * {@link checkEvaluationIngestPayload} re-derives it and rejects a mismatch.
   */
  readonly accountableOwners: readonly string[];

  /**
   * Count of violations that BLOCK: `severity === 'error'` and not `frozen`.
   * Same derivation as `buildEnforcerEvidence` (EVD-03), so the ledger row and
   * the evidence manifest cannot disagree about whether a run blocked.
   */
  readonly blockingViolationCount: number;

  /** Versions of what produced the verdict (audit/reproducibility). */
  readonly versions: {
    readonly core: string;
    readonly ruleset?: string;
    readonly rulesetVersion?: string;
    readonly policy?: string;
    readonly blueprint?: string;
  };
}

// ---------------------------------------------------------------------------
// The derivation map — what makes this contract derived, not restated
// ---------------------------------------------------------------------------

/** One wire field and the source path it is derived from. */
export interface IngestFieldSource {
  /** Dotted path on {@link EvaluationIngestPayload}. */
  readonly field: string;
  /**
   * Dotted path on the source type, rooted at `EvaluationResult` or
   * `Violation`. `[]` marks an array element. `null` when the field is derived
   * by this contract rather than copied (`schemaVersion`, `producer`,
   * `accountableOwners`, `blockingViolationCount`).
   */
  readonly source: string | null;
  /** Why it is not a straight copy, when it is not. */
  readonly note?: string;
}

/**
 * For every wire field, where it comes from.
 *
 * This is the anti-drift mechanism. `evaluation-ingest.spec.ts` imports the real
 * `@beyondnet/evolith-core-domain`, runs its real pipeline (`evaluateDriftGate`,
 * which is what actually produces owner-enriched `Violation`s today), and walks
 * every non-null `source` here against the objects that pipeline returns. Rename
 * `Violation.owner` or `RuleExecutionRef.engine` upstream and the walk stops
 * resolving — the suite goes red instead of the wire shape silently diverging.
 *
 * A `null` source is a claim too: it asserts the field is this contract's own
 * derivation and has no upstream counterpart to drift from.
 */
export const EVALUATION_INGEST_FIELD_SOURCES: readonly IngestFieldSource[] = Object.freeze([
  Object.freeze({ field: 'schemaVersion', source: null, note: 'pin of EVALUATION_INGEST_SCHEMA_VERSION' }),
  Object.freeze({
    field: 'correlationId',
    source: 'EvaluationResult.correlationId',
    note: 'OPTIONAL upstream, REQUIRED here; synthesized by resolveIngestCorrelationId when absent',
  }),
  Object.freeze({ field: 'producer.surface', source: null, note: 'supplied by the depositing surface' }),
  Object.freeze({ field: 'producer.version', source: null, note: 'supplied by the depositing surface' }),
  Object.freeze({ field: 'evaluatedAt', source: 'EvaluationResult.evaluatedAt' }),
  Object.freeze({ field: 'overallVerdict', source: 'EvaluationResult.overallVerdict' }),
  Object.freeze({ field: 'outcome', source: 'EvaluationResult.outcome' }),
  Object.freeze({
    field: 'requestedBy.actorType',
    source: 'EvaluationResult.requester.actorType',
    note: 'WHO ASKED — never the accountable owner',
  }),
  Object.freeze({ field: 'requestedBy.actorId', source: 'EvaluationResult.requester.actorId' }),
  Object.freeze({ field: 'requestedBy.modelRef', source: 'EvaluationResult.requester.modelRef' }),
  Object.freeze({ field: 'requestedBy.sessionId', source: 'EvaluationResult.requester.sessionId' }),
  Object.freeze({ field: 'repositoryRevision.revision', source: 'EvaluationResult.repositoryRevision.revision' }),
  Object.freeze({ field: 'repositoryRevision.repositoryRef', source: 'EvaluationResult.repositoryRevision.repositoryRef' }),
  Object.freeze({ field: 'repositoryRevision.branch', source: 'EvaluationResult.repositoryRevision.branch' }),
  Object.freeze({ field: 'repositoryRevision.committedAt', source: 'EvaluationResult.repositoryRevision.committedAt' }),
  Object.freeze({ field: 'repositoryRevision.dirty', source: 'EvaluationResult.repositoryRevision.dirty' }),
  Object.freeze({ field: 'rulesExecuted[].ruleId', source: 'EvaluationResult.rulesExecuted[].ruleId' }),
  Object.freeze({ field: 'rulesExecuted[].rulesetRef', source: 'EvaluationResult.rulesExecuted[].rulesetRef' }),
  Object.freeze({
    field: 'rulesExecuted[].engine',
    source: 'EvaluationResult.rulesExecuted[].engine',
    note: 'THE TRUE ENGINE — carried verbatim, never coerced to a known value',
  }),
  Object.freeze({ field: 'rulesExecuted[].verdict', source: 'EvaluationResult.rulesExecuted[].verdict' }),
  Object.freeze({ field: 'violations[].ruleId', source: 'Violation.ruleId' }),
  Object.freeze({ field: 'violations[].tool', source: 'Violation.tool' }),
  Object.freeze({ field: 'violations[].file', source: 'Violation.file' }),
  Object.freeze({ field: 'violations[].line', source: 'Violation.line' }),
  Object.freeze({ field: 'violations[].column', source: 'Violation.column' }),
  Object.freeze({ field: 'violations[].severity', source: 'Violation.severity' }),
  Object.freeze({ field: 'violations[].message', source: 'Violation.message' }),
  Object.freeze({ field: 'violations[].adrRef', source: 'Violation.adrRef' }),
  Object.freeze({
    field: 'violations[].accountableOwner',
    source: 'Violation.owner',
    note: 'WHO MUST FIX IT — renamed on the wire so it cannot be read as the requester',
  }),
  Object.freeze({ field: 'violations[].category', source: 'Violation.category' }),
  Object.freeze({ field: 'violations[].complianceControls', source: 'Violation.complianceControls' }),
  Object.freeze({ field: 'violations[].fingerprint', source: 'Violation.fingerprint' }),
  Object.freeze({ field: 'violations[].frozen', source: 'Violation.frozen' }),
  Object.freeze({
    field: 'accountableOwners',
    source: null,
    note: 'derived: distinct sorted Violation.owner values',
  }),
  Object.freeze({
    field: 'blockingViolationCount',
    source: null,
    note: "derived: violations where severity === 'error' && !frozen (same rule as buildEnforcerEvidence/EVD-03)",
  }),
  Object.freeze({ field: 'versions.core', source: 'EvaluationResult.versions.core' }),
  Object.freeze({ field: 'versions.ruleset', source: 'EvaluationResult.versions.ruleset' }),
  Object.freeze({ field: 'versions.rulesetVersion', source: 'EvaluationResult.versions.rulesetVersion' }),
  Object.freeze({ field: 'versions.policy', source: 'EvaluationResult.versions.policy' }),
  Object.freeze({ field: 'versions.blueprint', source: 'EvaluationResult.versions.blueprint' }),
]);

// ---------------------------------------------------------------------------
// The mapper's input — the subset of the source types it reads
// ---------------------------------------------------------------------------

/**
 * The part of `EvaluationResult` this mapper reads.
 *
 * Structural, so a real `EvaluationResult` is assignable to it without this
 * package importing core-domain (see the module header for why it must not).
 * The spec asserts that assignability against the real type, so a source-side
 * removal is a compile error there rather than a silent `undefined` here.
 */
export interface IngestSourceResult {
  readonly overallVerdict: string;
  readonly outcome: string;
  readonly evaluatedAt: string;
  readonly correlationId?: string;
  readonly rulesExecuted: readonly {
    readonly ruleId: string;
    readonly rulesetRef?: string;
    readonly engine: string;
    readonly verdict: string;
  }[];
  readonly requester?: {
    readonly actorType: string;
    readonly actorId: string;
    readonly modelRef?: string;
    readonly sessionId?: string;
  };
  readonly repositoryRevision?: {
    readonly revision: string;
    readonly repositoryRef?: string;
    readonly branch?: string;
    readonly committedAt?: string;
    readonly dirty?: boolean;
  };
  readonly versions: {
    readonly core: string;
    readonly ruleset?: string;
    readonly rulesetVersion?: string;
    readonly policy?: string;
    readonly blueprint?: string;
  };
}

/** The part of `Violation` this mapper reads. Structural, for the same reason. */
export interface IngestSourceViolation {
  readonly ruleId: string;
  readonly tool: string;
  readonly file: string;
  readonly line?: number;
  readonly column?: number;
  readonly severity: string;
  readonly message: string;
  readonly adrRef?: string;
  readonly owner?: string;
  readonly category?: string;
  readonly complianceControls?: readonly string[];
  readonly fingerprint: string;
  readonly frozen: boolean;
}

/** Everything {@link toEvaluationIngestPayload} needs. */
export interface EvaluationIngestInput {
  readonly result: IngestSourceResult;
  /**
   * The run's canonical violations — what `evaluationResultToViolations` +
   * the CODEOWNERS/IDP enrichment produce, i.e. `evaluateDriftGate(...).evidence.violations`.
   * Passed in rather than re-derived here: deriving them would mean
   * reimplementing the normalizer in the contract package, which is the second
   * mapper this gap exists to prevent.
   */
  readonly violations: readonly IngestSourceViolation[];
  readonly surface: EvaluationIngestSurface;
  /** Version of the producing surface, when it knows its own. */
  readonly producerVersion?: string;
  /**
   * Overrides `result.correlationId`. Supply it when the surface already
   * synthesized one (the CLI's envelope, the drift gate's evidence id) so the
   * ledger row and the local artifact carry the SAME id.
   */
  readonly correlationId?: string;
}

// ---------------------------------------------------------------------------
// Correlation — required on the wire, synthesized at the boundary
// ---------------------------------------------------------------------------

/** Raised when a payload cannot be built without inventing something. */
export class EvaluationIngestContractError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EvaluationIngestContractError';
  }
}

/**
 * The boundary synthesis for {@link EvaluationIngestPayload.correlationId}.
 *
 * Precedence: an explicit override, then the result's own `correlationId`, then
 * `<surface>-eval-<evaluatedAt>`. The last form mirrors what
 * `evaluate.command.ts` already puts in its success envelope
 * (`cli-eval-${result.evaluatedAt}`), so a CLI run's envelope and its ledger row
 * carry the same id without either side having to know about the other.
 *
 * Synthesis is DETERMINISTIC — no uuid, no clock. Two deposits of the same
 * verdict must produce the same id, or the endpoint's idempotency is decorative.
 *
 * @throws EvaluationIngestContractError when even the fallback would be empty,
 * i.e. the result carries no `evaluatedAt`. Better a loud failure than a row
 * keyed on `cli-eval-undefined`.
 */
export function resolveIngestCorrelationId(
  result: Pick<IngestSourceResult, 'correlationId' | 'evaluatedAt'>,
  surface: EvaluationIngestSurface,
  override?: string,
): string {
  const explicit = nonEmpty(override) ?? nonEmpty(result.correlationId);
  if (explicit) return explicit;

  const evaluatedAt = nonEmpty(result.evaluatedAt);
  if (!evaluatedAt) {
    throw new EvaluationIngestContractError(
      'cannot synthesize correlationId: the result carries neither a correlationId nor an evaluatedAt',
    );
  }
  return `${surface}-eval-${evaluatedAt}`;
}

function nonEmpty(value: string | undefined | null): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined;
}

/** Drop `undefined` members so the JSON body carries absence as absence, not as null. */
function compact<T extends object>(value: T): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value)) {
    if (v !== undefined) out[k] = v;
  }
  return out as T;
}

// ---------------------------------------------------------------------------
// The mapper
// ---------------------------------------------------------------------------

/**
 * Project an `EvaluationResult` plus its canonical violations onto the wire.
 *
 * Invariants, all of them load-bearing:
 *  - `engine` is carried VERBATIM. An unknown engine stays unknown.
 *  - `Violation.owner` becomes `accountableOwner` and is NEVER back-filled from
 *    `requester.actorId`. The two owners stay two.
 *  - no `tenantId` is emitted, ever. The Tracker derives it from the key.
 *  - nothing is invented: absent optionals are omitted, not defaulted.
 */
export function toEvaluationIngestPayload(input: EvaluationIngestInput): EvaluationIngestPayload {
  const { result, violations, surface } = input;

  if (!isEvaluationIngestSurface(surface)) {
    throw new EvaluationIngestContractError(
      `unknown producer surface '${String(surface)}'; expected one of ${EVALUATION_INGEST_SURFACES.join(' | ')}`,
    );
  }

  const mappedViolations: readonly IngestViolation[] = Object.freeze(
    violations.map((v) =>
      Object.freeze(
        compact<IngestViolation>({
          ruleId: v.ruleId,
          tool: v.tool,
          file: v.file,
          line: v.line,
          column: v.column,
          severity: v.severity,
          message: v.message,
          adrRef: v.adrRef,
          // WHO MUST FIX IT. Not the requester. Never the requester.
          accountableOwner: v.owner,
          category: v.category,
          complianceControls: v.complianceControls,
          fingerprint: v.fingerprint,
          frozen: v.frozen,
        }),
      ),
    ),
  );

  return Object.freeze(
    compact<EvaluationIngestPayload>({
      schemaVersion: EVALUATION_INGEST_SCHEMA_VERSION,
      correlationId: resolveIngestCorrelationId(result, surface, input.correlationId),
      producer: Object.freeze(
        compact<IngestProducer>({ surface, version: input.producerVersion }),
      ),
      evaluatedAt: result.evaluatedAt,
      overallVerdict: result.overallVerdict,
      outcome: result.outcome,
      requestedBy: result.requester
        ? Object.freeze(
            compact<IngestRequesterRef>({
              actorType: result.requester.actorType,
              actorId: result.requester.actorId,
              modelRef: result.requester.modelRef,
              sessionId: result.requester.sessionId,
            }),
          )
        : undefined,
      repositoryRevision: result.repositoryRevision
        ? Object.freeze(
            compact<IngestRepositoryRevision>({
              revision: result.repositoryRevision.revision,
              repositoryRef: result.repositoryRevision.repositoryRef,
              branch: result.repositoryRevision.branch,
              committedAt: result.repositoryRevision.committedAt,
              dirty: result.repositoryRevision.dirty,
            }),
          )
        : undefined,
      rulesExecuted: Object.freeze(
        result.rulesExecuted.map((r) =>
          Object.freeze(
            compact<IngestRuleExecution>({
              ruleId: r.ruleId,
              rulesetRef: r.rulesetRef,
              engine: r.engine,
              verdict: r.verdict,
            }),
          ),
        ),
      ),
      violations: mappedViolations,
      accountableOwners: collectAccountableOwners(mappedViolations),
      blockingViolationCount: countBlockingViolations(mappedViolations),
      versions: Object.freeze(
        compact({
          core: result.versions.core,
          ruleset: result.versions.ruleset,
          rulesetVersion: result.versions.rulesetVersion,
          policy: result.versions.policy,
          blueprint: result.versions.blueprint,
        }),
      ),
    }),
  );
}

/** Distinct, sorted accountable owners. Exported so the oracle re-derives with the same rule. */
export function collectAccountableOwners(
  violations: readonly Pick<IngestViolation, 'accountableOwner'>[],
): readonly string[] {
  return Object.freeze(
    [...new Set(violations.map((v) => v.accountableOwner).filter((o): o is string => !!o && o.length > 0))].sort(),
  );
}

/**
 * Violations that BLOCK: non-frozen errors. Identical rule to
 * `buildEnforcerEvidence`'s `blockingFailures` (EVD-03), so the ledger row and
 * the evidence manifest can be cross-checked and never disagree.
 */
export function countBlockingViolations(
  violations: readonly Pick<IngestViolation, 'severity' | 'frozen'>[],
): number {
  return violations.filter((v) => v.severity === 'error' && !v.frozen).length;
}

// ---------------------------------------------------------------------------
// The consumer-driven oracle
// ---------------------------------------------------------------------------

export interface IngestContractCheckResult {
  readonly ok: boolean;
  readonly problems: readonly string[];
}

/**
 * Assert a received body against this contract.
 *
 * Written for the CONSUMER: the Tracker pins this package and runs this over
 * what its endpoint actually deserialized, so a C#-side DTO that quietly dropped
 * `rulesExecuted[].engine` turns a Tracker test red rather than producing a
 * ledger of engine-less rows. The producer runs it too, on its own output.
 *
 * It checks presence and shape, not business meaning — and it explicitly rejects
 * a `tenantId`, which is the one field whose PRESENCE is the defect.
 */
export function checkEvaluationIngestPayload(value: unknown): IngestContractCheckResult {
  const problems: string[] = [];
  if (typeof value !== 'object' || value === null) {
    return Object.freeze({ ok: false, problems: Object.freeze(['payload is not an object']) });
  }
  const p = value as Record<string, unknown>;

  if ('tenantId' in p) {
    problems.push(
      'payload carries tenantId: the tenant MUST be derived from the matched machine key, never accepted from the body',
    );
  }

  for (const key of ['schemaVersion', 'correlationId', 'evaluatedAt', 'overallVerdict', 'outcome'] as const) {
    if (typeof p[key] !== 'string' || (p[key] as string).length === 0) {
      problems.push(`${key} is missing or not a non-empty string`);
    }
  }

  const producer = p.producer as Record<string, unknown> | undefined;
  if (!producer || typeof producer !== 'object') {
    problems.push('producer is missing');
  } else if (!isEvaluationIngestSurface(producer.surface)) {
    problems.push(
      `producer.surface '${String(producer.surface)}' is not one of ${EVALUATION_INGEST_SURFACES.join(' | ')}`,
    );
  }

  if (p.requestedBy !== undefined) {
    const r = p.requestedBy as Record<string, unknown>;
    if (typeof r?.actorType !== 'string' || typeof r?.actorId !== 'string') {
      problems.push('requestedBy is present but lacks actorType/actorId');
    }
  }

  const rules = p.rulesExecuted;
  if (!Array.isArray(rules)) {
    problems.push('rulesExecuted is missing or not an array');
  } else {
    rules.forEach((r, i) => {
      const rule = r as Record<string, unknown>;
      if (typeof rule?.ruleId !== 'string') problems.push(`rulesExecuted[${i}].ruleId is missing`);
      if (typeof rule?.engine !== 'string' || (rule.engine as string).length === 0) {
        problems.push(`rulesExecuted[${i}].engine is missing — the true engine is the point of this field`);
      }
      if (typeof rule?.verdict !== 'string') problems.push(`rulesExecuted[${i}].verdict is missing`);
    });
  }

  const violations = p.violations;
  if (!Array.isArray(violations)) {
    problems.push('violations is missing or not an array');
  } else {
    violations.forEach((v, i) => {
      const violation = v as Record<string, unknown>;
      if (typeof violation?.ruleId !== 'string') problems.push(`violations[${i}].ruleId is missing`);
      if (typeof violation?.fingerprint !== 'string' || (violation.fingerprint as string).length === 0) {
        problems.push(`violations[${i}].fingerprint is missing — it is the row's dedup identity`);
      }
      if (typeof violation?.frozen !== 'boolean') problems.push(`violations[${i}].frozen is missing`);
      if ('owner' in violation) {
        problems.push(
          `violations[${i}] carries 'owner': the wire field is 'accountableOwner', kept distinct from requestedBy.actorId`,
        );
      }
    });

    const expectedOwners = collectAccountableOwners(violations as readonly IngestViolation[]);
    const actualOwners = p.accountableOwners;
    if (!Array.isArray(actualOwners) || actualOwners.join(' ') !== expectedOwners.join(' ')) {
      problems.push(
        `accountableOwners does not match the owners in violations (expected [${expectedOwners.join(', ')}])`,
      );
    }

    const expectedBlocking = countBlockingViolations(violations as readonly IngestViolation[]);
    if (p.blockingViolationCount !== expectedBlocking) {
      problems.push(`blockingViolationCount is ${String(p.blockingViolationCount)}, expected ${expectedBlocking}`);
    }
  }

  const versions = p.versions as Record<string, unknown> | undefined;
  if (!versions || typeof versions.core !== 'string') {
    problems.push('versions.core is missing');
  }

  return Object.freeze({ ok: problems.length === 0, problems: Object.freeze(problems) });
}

/** Throwing form of {@link checkEvaluationIngestPayload}, for use in a test's arrange step. */
export function assertEvaluationIngestPayload(value: unknown): void {
  const { ok, problems } = checkEvaluationIngestPayload(value);
  if (!ok) {
    throw new EvaluationIngestContractError(`ingest payload violates the contract:\n - ${problems.join('\n - ')}`);
  }
}

// ---------------------------------------------------------------------------
// What the persistent side must expose
// ---------------------------------------------------------------------------

/**
 * The endpoint specification.
 *
 * NOT built here: the route, its machine-key handler and the
 * `core_evaluation_transactions` write live in `beyondnetcode/evolith_tracker`.
 * This constant is what that endpoint is written against and reviewed with, and
 * it is deliberately data rather than prose so a Tracker-side test can assert
 * its own route against it after re-pinning this package.
 *
 * The auth clause is not a new invention: it is the shape
 * `TrackerApprovalHttpClient` already uses for `POST /runtime-approvals` — key in
 * `x-api-key`, tenant derived from WHICH key matched, tenant never on the wire.
 */
export const EVALUATION_INGEST_ENDPOINT_CONTRACT = Object.freeze({
  method: 'POST',
  /** `baseUrl` already includes the `/api/v1` prefix, as `/runtime-approvals` does. */
  path: '/core-evaluation-transactions',
  owner: 'beyondnetcode/evolith_tracker',
  auth: Object.freeze({
    header: 'x-api-key',
    principal: 'CoreMachine key',
    tenantResolution:
      'derived from WHICH key matched — the tenant is NEVER sent in the body; a body-supplied tenant must be rejected',
    precedent: 'agent-runtime/src/adapters/approval/tracker-approval.http-client.ts (POST /runtime-approvals)',
    failureModes: Object.freeze([
      '401 — absent or unknown key',
      '400 — body fails checkEvaluationIngestPayload',
      '409 — never; a repeated correlationId is a 200 over the existing row (see idempotency)',
    ]),
  }),
  bodyType: 'EvaluationIngestPayload',
  idempotency: Object.freeze({
    key: 'correlationId',
    scope: 'tenant (derived from the key)',
    rule: 'a second deposit with the same (tenant, correlationId) updates the existing row and returns 200 — it never creates a second row and never 409s. Retrying CI must not double-count a verdict.',
  }),
  response: Object.freeze({
    shape: '{ transactionId: string, correlationId: string, created: boolean }',
    note: '`created` distinguishes a first deposit from an idempotent replay, so a producer can log which it was',
  }),
  persistence: Object.freeze({
    table: 'core_evaluation_transactions',
    schema: 'tracker_governance',
    note: 'the existing table; this contract adds a Core-INITIATED writer to it, it does not propose a new one',
    requiredIndex: 'unique (tenant_id, correlation_id) — without it the idempotency rule above is unenforceable',
  }),
});
