/**
 * GT-565 — SDK ⇄ wire type contract (compile-time half).
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * `@beyondnet/evolith-sdk` drifted from the API it claims to type: it declared
 * `passed: boolean` where the wire emits `verdict: 'passed'|'failed'|'skipped'`,
 * omitted `gateId` / `rulesetRef` / `rulesetVersion` (all emitted), dropped the
 * required `location` on violations, and invented `artifact?` / `remediation?`
 * that no producer writes.
 *
 * Nobody noticed because the SDK's own suite is SELF-CONFIRMING: `sdk.spec.ts`
 * mocks `fetch` to return the SDK's *invented* shape and then asserts on it. The
 * SDK can drift arbitrarily and stay green. This file removes that freedom by
 * asserting the SDK's public types against the DOMAIN CONTRACT the producers
 * actually return — a source neither the SDK nor its tests control.
 *
 * TWO LAYERS, BOTH IN THIS FILE
 * -----------------------------
 *  (1) Compile-time identity assertions: SDK public types vs `core-domain`
 *      contracts. Zero runtime cost; catches drift on EITHER side.
 *  (2) `WIRE_*` descriptors: runtime validators whose key set AND per-key
 *      optionality are *type-derived from the SDK types themselves*. Add,
 *      remove, or change the optionality of an SDK field and these objects stop
 *      compiling until updated. `sdk-wire-contract.spec.ts` then runs them
 *      against a REAL booted core-api response — so the runtime checker can
 *      never silently diverge from the type it is supposed to enforce.
 *
 * This file is deliberately NOT a `.spec.ts`: the contract jest project runs
 * ts-jest with `diagnostics: { warnOnly: true }`, which would demote every
 * assertion below to a console warning. It is instead type-checked by a
 * dedicated strict project (`tsconfig.sdk-type-contract.json`) that the spec
 * shells out to, so a type error here is a hard test failure.
 *
 * OWNERSHIP: this file expresses the INVARIANT ("SDK types describe the wire"),
 * not today's broken state. It is expected to FAIL against the pre-unification
 * SDK and to pass once the SDK is unified onto the domain contract.
 */

// ─── The wire's authority: core-domain contracts the producers return ────────
// `evaluate-gate.use-case.ts` returns `GateEvidence`; `gates.controller.ts`
// wraps it in the ADR-0073 envelope and returns it verbatim.
import type {
  GateEvidence as DomainGateEvidence,
  GateViolation as DomainGateViolation,
  GateVerdict as DomainGateVerdict,
  GatePhase as DomainGatePhase,
  ViolationSeverity as DomainViolationSeverity,
  EvaluatorKind as DomainEvaluatorKind,
} from '../../packages/core-domain/src/domain/gate-evidence';

// `architecture.controller.ts:62` returns `response.result`, i.e. this exact
// `ValidationResult` (the `evaluationVerdict.outputEnvelope` branch only fires
// when a manifest is supplied).
import type {
  ValidationResult as DomainValidationResult,
  ValidationIssue as DomainValidationIssue,
} from '../../packages/core-domain/src/application/validators/ruleset-validator.types';

// ─── The claim under test: the SDK's PUBLIC types ────────────────────────────
// Imported through the package entrypoint, not deep paths, so that internal
// file moves during the 2.0.0 unification do not masquerade as drift.
import type {
  GateEvidence as SdkGateEvidence,
  RestGateViolation as SdkRestGateViolation,
  ValidationResult as SdkValidationResult,
  GateEvaluateOutput as SdkGateEvaluateOutput,
  McpGateViolation as SdkMcpGateViolation,
} from '../../packages/sdk-client/src/index';

// ─────────────────────────────────────────────────────────────────────────────
// Type-level assertion toolkit
//
// Each helper resolves to `true` on success and to a type that NAMES the
// offending members on failure, so the compiler error reads like a diff:
//
//   Type '"gateId" | "rulesetRef" | "rulesetVersion"' does not satisfy the
//   constraint 'true'.
//
// ...rather than an opaque "Type A is not assignable to type B".
// ─────────────────────────────────────────────────────────────────────────────

/** Anchors an assertion. `_Because` documents the invariant at the failure site. */
type Expect<T extends true, _Because extends string> = T;

/** Strict type identity (invariant, so optionality and unions are compared exactly). */
type Equals<X, Y> =
  (<T>() => T extends X ? 1 : 2) extends (<T>() => T extends Y ? 1 : 2) ? true : false;

/** Strips `readonly` and unwraps `readonly T[]` so mutability alone is not "drift". */
type Normalize<T> = {
  -readonly [K in keyof T]: T[K] extends readonly (infer E)[] ? E[] : T[K];
};

/** `true`, or the union of keys the wire emits that the SDK fails to declare. */
type NoFieldsMissing<Wire, Sdk> =
  [Exclude<keyof Wire, keyof Sdk>] extends [never] ? true : Exclude<keyof Wire, keyof Sdk>;

/** `true`, or the union of keys the SDK invents that no producer emits. */
type NoFieldsInvented<Wire, Sdk> =
  [Exclude<keyof Sdk, keyof Wire>] extends [never] ? true : Exclude<keyof Sdk, keyof Wire>;

/** `true`, or the union of shared keys whose types disagree. */
type NoFieldsDisagree<Wire, Sdk> = [
  {
    [K in Extract<keyof Wire, keyof Sdk>]: Equals<
      Normalize<Wire>[K & keyof Wire],
      Normalize<Sdk>[K & keyof Sdk]
    > extends true
      ? never
      : K;
  }[Extract<keyof Wire, keyof Sdk>],
] extends [never]
  ? true
  : {
      [K in Extract<keyof Wire, keyof Sdk>]: Equals<
        Normalize<Wire>[K & keyof Wire],
        Normalize<Sdk>[K & keyof Sdk]
      > extends true
        ? never
        : K;
    }[Extract<keyof Wire, keyof Sdk>];

/** All three checks at once, for the common case. */
type Describes<Wire, Sdk> = [
  NoFieldsMissing<Wire, Sdk>,
  NoFieldsInvented<Wire, Sdk>,
  NoFieldsDisagree<Wire, Sdk>,
];

// ─────────────────────────────────────────────────────────────────────────────
// (1) Gate evaluation — evaluate-gate.use-case.ts → gates.controller.ts
//                       and gate.tools.ts (MCP), same domain payload.
// ─────────────────────────────────────────────────────────────────────────────

export type _GateEvidence_declares_every_emitted_field = Expect<
  NoFieldsMissing<DomainGateEvidence, SdkGateEvidence>,
  'The API emits gateId/rulesetRef/rulesetVersion; the SDK must declare them.'
>;

export type _GateEvidence_invents_nothing = Expect<
  NoFieldsInvented<DomainGateEvidence, SdkGateEvidence>,
  'The SDK must not declare fields (e.g. `passed`, `summary`) no producer emits.'
>;

export type _GateEvidence_field_types_agree = Expect<
  NoFieldsDisagree<DomainGateEvidence, SdkGateEvidence>,
  'Shared gate-evidence fields must have identical types on both sides.'
>;

export type _GateViolation_describes_the_wire = Expect<
  Equals<Describes<DomainGateViolation, SdkRestGateViolation>, [true, true, true]>,
  'Violations carry a REQUIRED `location`; `artifact`/`remediation` are invented.'
>;

// The MCP surface (`gate.tools.ts`) returns the same domain payload, with ONE
// documented addition: under `evidenceMode: 'summary'` the tool empties
// `violations` and attaches a per-severity roll-up (gate.tools.ts:70-73).
// So the MCP type must cover every domain field with identical types, and its
// only permitted extra key is `summary`. Asserting the extra-key set exactly
// (rather than just allowing extras) keeps this from becoming a hole through
// which new invented fields could slip.
export type _McpGateOutput_declares_every_emitted_field = Expect<
  NoFieldsMissing<DomainGateEvidence, SdkGateEvaluateOutput>,
  'The MCP gate tool returns GateEvidence verbatim; every field must be declared.'
>;

export type _McpGateOutput_field_types_agree = Expect<
  NoFieldsDisagree<DomainGateEvidence, SdkGateEvaluateOutput>,
  'Shared MCP gate-evidence fields must have identical types on both sides.'
>;

export type _McpGateOutput_adds_only_the_summary_rollup = Expect<
  Equals<Exclude<keyof SdkGateEvaluateOutput, keyof DomainGateEvidence>, 'summary'>,
  'gate.tools.ts adds `summary` and nothing else; any other extra key is invented.'
>;

export type _McpGateViolation_describes_the_wire = Expect<
  Equals<Describes<DomainGateViolation, SdkMcpGateViolation>, [true, true, true]>,
  'MCP violations are domain GateViolation; `info` severity does not exist.'
>;

// Vocabulary assertions. These are what a `passed: boolean` SDK can never satisfy:
// the verdict is a three-valued enum, and `skipped` is neither true nor false.
export type _Verdict_vocabulary_is_the_domains = Expect<
  Equals<DomainGateVerdict, SdkGateEvidence extends { verdict: infer V } ? V : never>,
  'verdict must be the domain GateVerdict union, not a boolean.'
>;

export type _Severity_vocabulary_is_the_domains = Expect<
  Equals<
    DomainViolationSeverity,
    SdkRestGateViolation extends { severity: infer S } ? S : never
  >,
  'severity is error|warning — the SDK must not add `info`.'
>;

export type _Phase_vocabulary_is_the_domains = Expect<
  Equals<DomainGatePhase, SdkGateEvidence extends { phase: infer P } ? P : never>,
  'phase must be the domain GatePhase union.'
>;

export type _EvaluatorKind_vocabulary_is_the_domains = Expect<
  Equals<
    DomainEvaluatorKind,
    SdkGateEvidence extends { evaluatedBy: infer E } ? E : never
  >,
  'evaluatedBy is a required human|agent|ci enum, not an optional string.'
>;

// ─────────────────────────────────────────────────────────────────────────────
// (2) Architecture validation — architecture.controller.ts:62 → ValidationResult
// ─────────────────────────────────────────────────────────────────────────────

export type _ValidationResult_describes_the_wire = Expect<
  Equals<Describes<DomainValidationResult, SdkValidationResult>, [true, true, true]>,
  'validate-satellite emits status/rulesChecked/issues/coreRef/timestamp — not `passed`.'
>;

export type _ValidationIssue_describes_the_wire = Expect<
  Equals<
    Describes<
      DomainValidationIssue,
      SdkValidationResult extends { issues: (infer I)[] } ? I : never
    >,
    [true, true, true]
  >,
  'Issues carry MUST|SHOULD|COULD severity plus a required category/description.'
>;

// ─────────────────────────────────────────────────────────────────────────────
// (3) Runtime descriptors, welded to the SDK types at compile time
//
// `WireCheck<T>` derives BOTH the key set and each key's `required` flag from
// `T` itself. Consequences, all of them compile errors:
//   • add a field to the SDK type      → descriptor missing a property
//   • delete a field from the SDK type → descriptor has an excess property
//   • make a field optional (or not)   → `required: true/false` no longer matches
// So the runtime checker below cannot drift from the type it enforces, and
// `sdk-wire-contract.spec.ts` can trust it while running it against real HTTP.
// ─────────────────────────────────────────────────────────────────────────────

/** Keys of `T` that are NOT optional. */
type RequiredKeys<T> = {
  // eslint-disable-next-line @typescript-eslint/ban-types
  [K in keyof T]-?: {} extends Pick<T, K> ? never : K;
}[keyof T];

/** Element type of the `issues` array as the SDK declares it. */
type SdkValidationIssue = SdkValidationResult extends { issues: (infer I)[] } ? I : never;

export interface FieldContract<Req extends boolean> {
  /** Type-derived from the SDK type; cannot be hand-set to the wrong value. */
  readonly required: Req;
  /** Human-readable rendering of the SDK's declared type, used in failure output. */
  readonly declaredAs: string;
  /** Does a wire value satisfy the SDK's declared type? */
  readonly accepts: (value: unknown) => boolean;
}

export type WireCheck<T> = {
  readonly [K in keyof Required<T>]-?: FieldContract<K extends RequiredKeys<T> ? true : false>;
};

// ── predicate primitives ────────────────────────────────────────────────────
const isString = (v: unknown): boolean => typeof v === 'string';
const isNumber = (v: unknown): boolean => typeof v === 'number' && Number.isFinite(v);
const isBoolean = (v: unknown): boolean => typeof v === 'boolean';
const isArray = (v: unknown): boolean => Array.isArray(v);
const isObject = (v: unknown): boolean =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const oneOf =
  (...allowed: readonly string[]) =>
  (v: unknown): boolean =>
    typeof v === 'string' && allowed.includes(v);
const isIsoTimestamp = (v: unknown): boolean =>
  typeof v === 'string' && !Number.isNaN(Date.parse(v));

/**
 * Wire contract for the payload of `POST /api/v1/gates/:gateId/evaluate`
 * (envelope `data`) and of the `evolith-gate-evaluate` MCP tool.
 */
export const WIRE_GATE_EVIDENCE: WireCheck<SdkGateEvidence> = {
  gateId: { required: true, declaredAs: 'string', accepts: isString },
  phase: {
    required: true,
    declaredAs: "'discovery'|'design'|'construction'|'qa'|'release'",
    accepts: oneOf('discovery', 'design', 'construction', 'qa', 'release'),
  },
  verdict: {
    required: true,
    declaredAs: "'passed'|'failed'|'skipped'",
    accepts: oneOf('passed', 'failed', 'skipped'),
  },
  rulesetRef: { required: true, declaredAs: 'string', accepts: isString },
  rulesetVersion: { required: true, declaredAs: 'string', accepts: isString },
  violations: { required: true, declaredAs: 'GateViolation[]', accepts: isArray },
  evaluatedAt: { required: true, declaredAs: 'ISO-8601 string', accepts: isIsoTimestamp },
  evaluatedBy: {
    required: true,
    declaredAs: "'human'|'agent'|'ci'",
    accepts: oneOf('human', 'agent', 'ci'),
  },
};

/** Wire contract for each element of `GateEvidence.violations`. */
export const WIRE_GATE_VIOLATION: WireCheck<SdkRestGateViolation> = {
  ruleId: { required: true, declaredAs: 'string', accepts: isString },
  severity: {
    required: true,
    declaredAs: "'error'|'warning'",
    accepts: oneOf('error', 'warning'),
  },
  location: { required: true, declaredAs: 'string', accepts: isString },
  message: { required: true, declaredAs: 'string', accepts: isString },
};

/** Wire contract for the payload of `POST /api/v1/architecture/validate-satellite`. */
export const WIRE_VALIDATION_RESULT: WireCheck<SdkValidationResult> = {
  status: {
    required: true,
    declaredAs: "'passed'|'failed'|'warning'",
    accepts: oneOf('passed', 'failed', 'warning'),
  },
  rulesChecked: { required: true, declaredAs: 'number', accepts: isNumber },
  // GT-569: `rulesChecked` alone counts only what was evaluated, so it silently
  // redefined its own denominator — a corpus of 380 rules could report 111
  // "checked" with 269 never executed and nothing on the wire said so. These five
  // are optional so the envelope stays backwards-compatible for a consumer built
  // against the old shape, but a producer that omits them is normalised upstream
  // rather than allowed to emit a coverage number with no denominator.
  rulesSkipped: { required: false, declaredAs: 'number', accepts: isNumber },
  rulesErrored: { required: false, declaredAs: 'number', accepts: isNumber },
  rulesTotal: { required: false, declaredAs: 'number', accepts: isNumber },
  skippedRuleIds: { required: false, declaredAs: 'string[]', accepts: isArray },
  erroredRuleIds: { required: false, declaredAs: 'string[]', accepts: isArray },
  // GT-571: rules addressed to somebody else — the vendor's own monorepo, another
  // topology, a later SDLC phase — are pre-filtered before evaluation rather than
  // counted as `skipped`. Calling them skipped would inflate the unevaluated
  // fraction of a repo with nothing wrong with it, and could trip the
  // `maxSkippedFraction` gate. They are still reported, against `corpusTotal`
  // (= rulesTotal + rulesNotApplicable), so the exclusion is visible rather than
  // silent — the same denominator discipline GT-569 introduced.
  rulesNotApplicable: { required: false, declaredAs: 'number', accepts: isNumber },
  notApplicableRuleIds: { required: false, declaredAs: 'string[]', accepts: isArray },
  corpusTotal: { required: false, declaredAs: 'number', accepts: isNumber },
  // GT-595: `rulesSkipped` conflated two different facts — a rule the engine
  // could evaluate and did not, and a rule with nothing in it to evaluate. The
  // second is not a coverage debt anybody can pay off, so counting it made the
  // figure both worse and un-improvable. `rulesNonExecutable` is deliberately a
  // SUBSET of `rulesSkipped`, which leaves the GT-569 invariant
  // `rulesChecked + rulesSkipped + rulesErrored === rulesTotal` exactly intact,
  // and `rulesExecutable` names the denominator a coverage claim should be read
  // against. `blockingNonExecutableRuleIds` is the one that matters on the wire:
  // a rule declared blocking that structurally cannot run is a promise the
  // product does not keep, and a consumer is entitled to see it.
  rulesNonExecutable: { required: false, declaredAs: 'number', accepts: isNumber },
  nonExecutableRuleIds: { required: false, declaredAs: 'string[]', accepts: isArray },
  rulesExecutable: { required: false, declaredAs: 'number', accepts: isNumber },
  blockingNonExecutableRuleIds: { required: false, declaredAs: 'string[]', accepts: isArray },
  // GT-595 AC2: a SUPERSET of `blockingNonExecutableRuleIds` — every rule that
  // declared `blocking: true` and came back `skipped`, whether or not anything
  // could ever run it. Non-empty ⇒ `status: 'failed'`, so a consumer reading the
  // verdict is entitled to the ids behind it without parsing issue text.
  blockingSkippedRuleIds: { required: false, declaredAs: 'string[]', accepts: isArray },
  perRuleset: { required: false, declaredAs: 'RulesetCoverageRatio[]', accepts: isArray },
  // GT-661: the SCOPE of the verdict. A consumer that reads `status: 'failed'`
  // without this cannot tell "the packs I adopted failed" from "the Core
  // evaluated all 402 of its own opinions and something failed" — measured on
  // the Evolith Core repository, the second case is 85 blocking issues of 113,
  // none of them from a rule the caller chose. `source` is the discriminator and
  // is checked by value, not merely by presence, because a producer that emitted
  // some other string here would be describing a scope nobody can interpret.
  selection: {
    required: false,
    declaredAs: "{ source: 'caller'|'core-default'; requested: string[]; matched: string[]; unmatched: string[]; rulesSelected: number; corpusTotal: number }",
    accepts: (v) =>
      isObject(v) &&
      oneOf('caller', 'core-default')((v as Record<string, unknown>).source) &&
      isArray((v as Record<string, unknown>).requested) &&
      isArray((v as Record<string, unknown>).matched) &&
      isArray((v as Record<string, unknown>).unmatched) &&
      isNumber((v as Record<string, unknown>).rulesSelected) &&
      isNumber((v as Record<string, unknown>).corpusTotal),
  },
  issues: { required: true, declaredAs: 'ValidationIssue[]', accepts: isArray },
  coreRef: {
    required: true,
    declaredAs: '{ version: string|null; path: string|null }',
    accepts: (v) =>
      isObject(v) &&
      'version' in (v as object) &&
      'path' in (v as object),
  },
  timestamp: { required: true, declaredAs: 'ISO-8601 string', accepts: isIsoTimestamp },
};

/** Wire contract for each element of `ValidationResult.issues`. */
export const WIRE_VALIDATION_ISSUE: WireCheck<SdkValidationIssue> = {
  ruleId: { required: true, declaredAs: 'string', accepts: isString },
  severity: {
    required: true,
    declaredAs: "'MUST'|'SHOULD'|'COULD'",
    accepts: oneOf('MUST', 'SHOULD', 'COULD'),
  },
  category: { required: true, declaredAs: 'string', accepts: isString },
  title: { required: true, declaredAs: 'string', accepts: isString },
  description: { required: true, declaredAs: 'string', accepts: isString },
  blocking: { required: true, declaredAs: 'boolean', accepts: isBoolean },
  file: { required: false, declaredAs: 'string?', accepts: isString },
  expected: { required: false, declaredAs: 'string?', accepts: isString },
  actual: { required: false, declaredAs: 'string?', accepts: isString },
};
