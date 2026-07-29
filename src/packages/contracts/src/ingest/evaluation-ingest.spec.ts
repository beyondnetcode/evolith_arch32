/**
 * GT-604 — the ingest contract, bound to the REAL producing pipeline.
 *
 * This suite deliberately does NOT hand-write the objects it maps. It imports
 * `@beyondnet/evolith-core-domain` (a devDependency of this package; CI builds it
 * before running these tests — see `ci-cd.yml`, job `test-contracts`) and drives
 * `evaluateDriftGate`, which is the function that actually produces the
 * CODEOWNERS-enriched `Violation[]` a real `evolith evaluate --format drift` run
 * produces. The payload is then mapped from THAT.
 *
 * Two guards make the contract derived rather than restated:
 *
 *  1. `EVALUATION_INGEST_FIELD_SOURCES` names a source path for every wire
 *     field, and `walks every source path` below resolves each one against the
 *     real objects. Rename `Violation.owner` upstream and this goes red at
 *     RUNTIME — which matters, because this package's ts-jest runs with
 *     `diagnostics: false`, so a type-only guard would be silently skipped.
 *  2. The `IngestSourceResult` / `IngestSourceViolation` assignability
 *     assignments below are checked by `npx tsc --noEmit -p tsconfig.spec.json`
 *     and catch the same drift at compile time.
 */

import {
  evaluateDriftGate,
  emitEvaluationEvidence,
  makeViolation,
  parseCodeowners,
} from '@beyondnet/evolith-core-domain/evaluation';
import type { EvaluationResult } from '@beyondnet/evolith-core-domain/evaluation/contracts';
import type { Violation } from '@beyondnet/evolith-core-domain';

import {
  EVALUATION_INGEST_ENDPOINT_CONTRACT,
  EVALUATION_INGEST_FIELD_SOURCES,
  EVALUATION_INGEST_SCHEMA_VERSION,
  EVALUATION_INGEST_SURFACES,
  EvaluationIngestContractError,
  KNOWN_INGEST_ENGINES,
  assertEvaluationIngestPayload,
  checkEvaluationIngestPayload,
  collectAccountableOwners,
  countBlockingViolations,
  isEvaluationIngestSurface,
  isKnownIngestEngine,
  resolveIngestCorrelationId,
  toEvaluationIngestPayload,
  type EvaluationIngestPayload,
  type IngestSourceResult,
  type IngestSourceViolation,
} from './evaluation-ingest';

// ---------------------------------------------------------------------------
// Arrange — a real result, and the real pipeline that turns it into violations
// ---------------------------------------------------------------------------

const CODEOWNERS = parseCodeowners(
  ['src/packages/core-domain/ @evolith/core-team', 'docs/ @evolith/docs-team', ''].join('\n'),
);

/**
 * A result with everything the contract claims to carry: an unknown engine
 * (`semgrep`) beside the two known ones, an ADR-shaped gap, a docs-owned gap and
 * an unownable one, a requester, and a revision.
 *
 * Typed as the REAL `EvaluationResult`, so a field this contract depends on
 * cannot be removed upstream without breaking this file's compilation.
 */
const RESULT: EvaluationResult = {
  overallVerdict: 'FAIL',
  outcome: 'rejected',
  results: {},
  rulesExecuted: [
    { ruleId: 'HXA-01', rulesetRef: 'architecture/hexagonal', engine: 'native', verdict: 'FAIL' },
    { ruleId: 'POL-07', rulesetRef: 'policy/abac', engine: 'opa', verdict: 'PASS' },
    // The tolerance case. `KNOWN_RULE_ENGINES` is an OPEN vocabulary and the wire
    // must carry an unrecognised engine VERBATIM.
    { ruleId: 'SEC-11', engine: 'semgrep' as never, verdict: 'FAIL' },
  ],
  policiesApplied: [],
  gaps: [
    {
      id: 'g1',
      requirementRef: 'ADR-0002',
      severity: 'error',
      message: 'inbound adapter imports the domain directly',
      location: 'src/packages/core-domain/src/evaluation/drift-gate.ts:12:3',
    },
    {
      id: 'g2',
      requirementRef: 'DOC-01',
      severity: 'warning',
      message: 'ADR has no consequences section',
      location: 'docs/adr/ADR-0002.md:4',
    },
    {
      id: 'g3',
      requirementRef: 'CFG-09',
      severity: 'error',
      message: 'evolith.yaml declares no adrRegistry',
      location: 'evolith.yaml',
    },
  ],
  risks: [],
  missingEvidence: [],
  incompleteArtifacts: [],
  recommendations: [],
  requiredActions: [],
  confidence: 0.9,
  rationale: '1 gate failed',
  // Every optional is populated on purpose: the source-path walk below can only
  // prove a path resolves if the sample actually carries it.
  versions: {
    core: '1.0.5',
    ruleset: 'core@2',
    rulesetVersion: '2.0.0',
    policy: 'abac@1.3.0',
    blueprint: 'modular-monolith@1',
  },
  requester: {
    actorType: 'agent',
    actorId: 'winston@evolith',
    modelRef: 'claude-opus-5',
    sessionId: 'sess-4f2a',
  },
  repositoryRevision: {
    revision: '9f3c1ab',
    repositoryRef: 'refs/heads/main',
    branch: 'main',
    committedAt: '2026-07-29T09:58:00.000Z',
    dirty: false,
  },
  evaluatedAt: '2026-07-29T10:00:00.000Z',
  schemaVersion: '1.0.0',
  correlationId: 'run-7788',
};

/** The violations a real drift-gate run produces — owner-enriched by core-domain, not by hand. */
const DECISION = evaluateDriftGate({ result: RESULT, codeowners: CODEOWNERS });
const VIOLATIONS: readonly Violation[] = DECISION.evidence.violations;

const PAYLOAD = toEvaluationIngestPayload({
  result: RESULT,
  violations: VIOLATIONS,
  surface: 'cli',
  producerVersion: 'evolith-cli@1.2.0',
});

// --- Compile-time conformance (checked by `tsc --noEmit -p tsconfig.spec.json`) ---
// A real EvaluationResult / Violation must satisfy the mapper's structural input.
// These are the type-level half of the derivation guarantee.
const _resultConformsToSource: IngestSourceResult = RESULT;
const _violationConformsToSource: IngestSourceViolation = VIOLATIONS[0];
void _resultConformsToSource;
void _violationConformsToSource;

// ---------------------------------------------------------------------------

describe('GT-604 · the arrangement is real, not stubbed', () => {
  it('drives the real core-domain pipeline and gets owner-enriched violations', () => {
    // Guard the denominator first: a suite that maps an empty array proves nothing.
    expect(VIOLATIONS.length).toBe(3);
    expect(DECISION.blocked).toBe(true);
    expect(VIOLATIONS.some((v) => v.owner === '@evolith/core-team')).toBe(true);
    expect(VIOLATIONS.some((v) => v.owner === '@evolith/docs-team')).toBe(true);
    // `evolith.yaml` matches no CODEOWNERS rule — an unattributed defect stays unattributed.
    expect(VIOLATIONS.some((v) => v.owner === undefined)).toBe(true);
  });
});

describe('GT-604 · the mapper', () => {
  it('produces a payload that satisfies its own oracle', () => {
    expect(() => assertEvaluationIngestPayload(PAYLOAD)).not.toThrow();
    expect(checkEvaluationIngestPayload(PAYLOAD)).toEqual({ ok: true, problems: [] });
    expect(PAYLOAD.schemaVersion).toBe(EVALUATION_INGEST_SCHEMA_VERSION);
  });

  it('carries the TRUE engine per executed rule, including one it does not know', () => {
    expect(PAYLOAD.rulesExecuted.map((r) => r.engine)).toEqual(['native', 'opa', 'semgrep']);
    // The unknown engine is carried, not coerced — and the helper says so without gating.
    expect(isKnownIngestEngine('semgrep')).toBe(false);
    expect(KNOWN_INGEST_ENGINES).toEqual(['native', 'opa', 'enforcer']);
    expect(PAYLOAD.rulesExecuted.map((r) => r.ruleId)).toEqual(['HXA-01', 'POL-07', 'SEC-11']);
    expect(PAYLOAD.rulesExecuted[0].rulesetRef).toBe('architecture/hexagonal');
  });

  it('keeps the TWO owners apart: who asked vs who must fix', () => {
    // Who asked.
    expect(PAYLOAD.requestedBy).toEqual({
      actorType: 'agent',
      actorId: 'winston@evolith',
      modelRef: 'claude-opus-5',
      sessionId: 'sess-4f2a',
    });

    // Who must fix.
    const byRule = new Map(PAYLOAD.violations.map((v) => [v.ruleId, v]));
    expect(byRule.get('ADR-0002')?.accountableOwner).toBe('@evolith/core-team');
    expect(byRule.get('DOC-01')?.accountableOwner).toBe('@evolith/docs-team');

    // They are never conflated: no violation is attributed to the requester.
    for (const v of PAYLOAD.violations) {
      expect(v.accountableOwner).not.toBe(PAYLOAD.requestedBy?.actorId);
    }
    // And the un-owned violation stays un-owned rather than inheriting the requester.
    expect(byRule.get('CFG-09')?.accountableOwner).toBeUndefined();
  });

  it('rolls up the distinct accountable owners, sorted', () => {
    expect(PAYLOAD.accountableOwners).toEqual(['@evolith/core-team', '@evolith/docs-team']);
    expect(collectAccountableOwners(PAYLOAD.violations)).toEqual(PAYLOAD.accountableOwners);
  });

  it('counts blocking violations by the same rule the evidence manifest uses', () => {
    expect(PAYLOAD.blockingViolationCount).toBe(2);
    expect(countBlockingViolations(PAYLOAD.violations)).toBe(2);
    // Cross-check against core-domain's own EVD-03 derivation over the same run.
    expect(PAYLOAD.blockingViolationCount).toBe(DECISION.evidence.blockingFailures);
  });

  it('carries the violations verbatim apart from the owner rename', () => {
    const source = VIOLATIONS.find((v) => v.ruleId === 'ADR-0002')!;
    const wire = PAYLOAD.violations.find((v) => v.ruleId === 'ADR-0002')!;
    expect(wire.fingerprint).toBe(source.fingerprint);
    expect(wire.file).toBe('src/packages/core-domain/src/evaluation/drift-gate.ts');
    expect(wire.line).toBe(12);
    expect(wire.column).toBe(3);
    expect(wire.severity).toBe('error');
    expect(wire.adrRef).toBe('ADR-0002');
    expect(wire.frozen).toBe(false);
    // The source name must NOT survive onto the wire.
    expect(wire as Record<string, unknown>).not.toHaveProperty('owner');
  });

  it('echoes the revision and the versions, and invents neither', () => {
    expect(PAYLOAD.repositoryRevision).toEqual({
      revision: '9f3c1ab',
      repositoryRef: 'refs/heads/main',
      branch: 'main',
      committedAt: '2026-07-29T09:58:00.000Z',
      dirty: false,
    });
    expect(PAYLOAD.versions).toEqual({
      core: '1.0.5',
      ruleset: 'core@2',
      rulesetVersion: '2.0.0',
      policy: 'abac@1.3.0',
      blueprint: 'modular-monolith@1',
    });
  });

  it('omits absent optionals instead of defaulting them', () => {
    const bare = toEvaluationIngestPayload({
      result: { ...RESULT, requester: undefined, repositoryRevision: undefined, versions: { core: '1.0.5' } },
      violations: [],
      surface: 'mcp',
    });
    expect(bare).not.toHaveProperty('requestedBy');
    expect(bare).not.toHaveProperty('repositoryRevision');
    expect(bare.versions).toEqual({ core: '1.0.5' });
    expect(bare.versions).not.toHaveProperty('policy');
    expect(bare.producer).toEqual({ surface: 'mcp' });
    expect(bare.accountableOwners).toEqual([]);
    expect(bare.blockingViolationCount).toBe(0);
  });

  it('never emits a tenantId — the Tracker derives the tenant from the matched key', () => {
    expect(JSON.stringify(PAYLOAD)).not.toContain('tenantId');
    expect(PAYLOAD).not.toHaveProperty('tenantId');
  });

  it('rejects a surface outside the closed vocabulary', () => {
    expect(() =>
      toEvaluationIngestPayload({
        result: RESULT,
        violations: VIOLATIONS,
        surface: 'jenkins' as never,
      }),
    ).toThrow(EvaluationIngestContractError);
    expect(EVALUATION_INGEST_SURFACES.every(isEvaluationIngestSurface)).toBe(true);
  });
});

describe('GT-604 · correlationId is REQUIRED on the wire', () => {
  it('uses the result correlationId when there is one', () => {
    expect(PAYLOAD.correlationId).toBe('run-7788');
  });

  it('synthesizes deterministically at the boundary when there is not', () => {
    const orphan = toEvaluationIngestPayload({
      result: { ...RESULT, correlationId: undefined },
      violations: VIOLATIONS,
      surface: 'cli',
    });
    // Mirrors what evaluate.command.ts already puts in its success envelope.
    expect(orphan.correlationId).toBe('cli-eval-2026-07-29T10:00:00.000Z');
    // Deterministic: the same verdict deposited twice must key the same row.
    const again = toEvaluationIngestPayload({
      result: { ...RESULT, correlationId: undefined },
      violations: VIOLATIONS,
      surface: 'cli',
    });
    expect(again.correlationId).toBe(orphan.correlationId);
  });

  it('lets a surface pin the id it already minted locally', () => {
    const pinned = toEvaluationIngestPayload({
      result: { ...RESULT, correlationId: undefined },
      violations: VIOLATIONS,
      surface: 'drift-gate',
      correlationId: DECISION.evidence.sourceRef,
    });
    expect(pinned.correlationId).toBe(DECISION.evidence.sourceRef);
  });

  it('treats blank as absent, and refuses to invent one out of nothing', () => {
    expect(resolveIngestCorrelationId({ correlationId: '   ', evaluatedAt: 'T' }, 'mcp')).toBe('mcp-eval-T');
    expect(() =>
      resolveIngestCorrelationId({ correlationId: undefined, evaluatedAt: '' }, 'mcp'),
    ).toThrow(EvaluationIngestContractError);
  });
});

describe('GT-604 · the oracle a consumer runs on what it received', () => {
  it('rejects a body that smuggles a tenantId', () => {
    const { ok, problems } = checkEvaluationIngestPayload({ ...PAYLOAD, tenantId: 'other-tenant' });
    expect(ok).toBe(false);
    expect(problems.join(' ')).toContain('tenantId');
  });

  it('rejects a rule that lost its engine — the exact defect the field exists for', () => {
    const stripped = {
      ...PAYLOAD,
      rulesExecuted: PAYLOAD.rulesExecuted.map(({ engine: _engine, ...rest }) => rest),
    };
    const { ok, problems } = checkEvaluationIngestPayload(stripped);
    expect(ok).toBe(false);
    expect(problems.filter((p) => p.includes('engine'))).toHaveLength(3);
  });

  it('rejects a violation that kept the source field name `owner`', () => {
    const collapsed = {
      ...PAYLOAD,
      violations: PAYLOAD.violations.map((v) => ({ ...v, owner: v.accountableOwner })),
    };
    expect(checkEvaluationIngestPayload(collapsed).ok).toBe(false);
  });

  it('rejects a roll-up or a count that disagrees with the violations', () => {
    expect(checkEvaluationIngestPayload({ ...PAYLOAD, accountableOwners: [] }).ok).toBe(false);
    expect(checkEvaluationIngestPayload({ ...PAYLOAD, blockingViolationCount: 0 }).ok).toBe(false);
  });

  it('rejects a non-object and a payload missing correlationId', () => {
    expect(checkEvaluationIngestPayload(null).ok).toBe(false);
    const { correlationId: _drop, ...noCorrelation } = PAYLOAD as EvaluationIngestPayload;
    const { ok, problems } = checkEvaluationIngestPayload(noCorrelation);
    expect(ok).toBe(false);
    expect(problems.join(' ')).toContain('correlationId');
  });
});

// ---------------------------------------------------------------------------
// The anti-drift guard
// ---------------------------------------------------------------------------

/** Resolve a dotted path with `[]` array markers, returning `false` when any hop is missing. */
function pathResolves(root: unknown, path: string): boolean {
  let current: unknown = root;
  for (const rawSegment of path.split('.')) {
    const isArray = rawSegment.endsWith('[]');
    const key = isArray ? rawSegment.slice(0, -2) : rawSegment;
    if (typeof current !== 'object' || current === null) return false;
    if (!(key in (current as Record<string, unknown>))) return false;
    current = (current as Record<string, unknown>)[key];
    if (isArray) {
      if (!Array.isArray(current) || current.length === 0) return false;
      current = current[0];
    }
  }
  return true;
}

/**
 * A violation carrying the fields the drift-gate path leaves unset (`category`
 * is set only by the security analyzers). Built by core-domain's own
 * `makeViolation`, not by an object literal, so it too participates in the
 * rename detection.
 */
const SECURITY_VIOLATION: Violation = makeViolation({
  ruleId: 'SEC-11',
  tool: 'checkov',
  file: 'product/infra/helm/values.yaml',
  line: 31,
  column: 7,
  severity: 'error',
  message: 'container runs as root',
  adrRef: 'ADR-0090',
  owner: '@evolith/platform-team',
  category: 'security',
  complianceControls: ['SOC2-CC6.1'],
});

describe('GT-604 · the wire shape is DERIVED, and cannot silently diverge', () => {
  // A path counts as resolved when it resolves on ANY sample of its root, so an
  // optional a given producer never sets is still proven to exist somewhere.
  // Every sample is produced by core-domain code, never by a literal here.
  const roots: Record<string, readonly unknown[]> = {
    EvaluationResult: [RESULT],
    Violation: [VIOLATIONS.find((v) => v.owner !== undefined)!, SECURITY_VIOLATION],
  };

  it('walks every source path against objects the real pipeline produced', () => {
    const unresolved: string[] = [];
    let checked = 0;
    for (const entry of EVALUATION_INGEST_FIELD_SOURCES) {
      if (entry.source === null) continue;
      const [rootName, ...rest] = entry.source.split('.');
      const samples = roots[rootName];
      expect(samples).toBeDefined();
      checked += 1;
      if (!samples.some((sample) => pathResolves(sample, rest.join('.')))) {
        unresolved.push(`${entry.field} <- ${entry.source}`);
      }
    }
    // Guard the denominator: a walk over zero paths is a green that means nothing.
    expect(checked).toBeGreaterThanOrEqual(30);
    expect(unresolved).toEqual([]);
  });

  it('maps every wire field, and claims a source for every one it maps', () => {
    const declared = new Set(EVALUATION_INGEST_FIELD_SOURCES.map((e) => e.field));
    const emitted: string[] = [];
    const walk = (value: unknown, prefix: string): void => {
      if (Array.isArray(value)) {
        if (value.length > 0 && typeof value[0] === 'object' && value[0] !== null) {
          walk(value[0], `${prefix}[]`);
        }
        return;
      }
      if (typeof value !== 'object' || value === null) {
        emitted.push(prefix);
        return;
      }
      for (const [k, v] of Object.entries(value)) walk(v, prefix ? `${prefix}.${k}` : k);
    };
    walk(PAYLOAD, '');

    // `accountableOwners` is an array of scalars; the walk stops at the array.
    const undeclared = emitted.filter((f) => !declared.has(f) && f !== 'accountableOwners');
    expect(undeclared).toEqual([]);
    expect(emitted.length).toBeGreaterThan(20);
  });

  it('declares a null source only for fields this contract itself derives', () => {
    const derived = EVALUATION_INGEST_FIELD_SOURCES.filter((e) => e.source === null).map((e) => e.field);
    expect(derived.sort()).toEqual([
      'accountableOwners',
      'blockingViolationCount',
      'producer.surface',
      'producer.version',
      'schemaVersion',
    ]);
    // Every derived field carries the reason it is derived.
    expect(EVALUATION_INGEST_FIELD_SOURCES.filter((e) => e.source === null && !e.note)).toEqual([]);
  });

  it('agrees with core-domain about the run it describes', () => {
    // These bind the payload to values core-domain computed by READING the result,
    // so a rename of `rulesExecuted` / `correlationId` / `evaluatedAt` upstream
    // desynchronises them even though ts-jest runs with diagnostics off.
    const manifest = emitEvaluationEvidence(RESULT, 'evaluation-result');
    expect(manifest.evaluatedRules).toEqual(['HXA-01', 'POL-07', 'SEC-11']);
    expect(manifest.sourceRef).toBe(PAYLOAD.correlationId);
    expect(manifest.generatedAt).toBe(PAYLOAD.evaluatedAt);
    expect(manifest.violations).toHaveLength(PAYLOAD.violations.length);
  });
});

describe('GT-604 · the endpoint the Tracker must expose', () => {
  it('specifies the route, and the tenant is never on the wire', () => {
    expect(EVALUATION_INGEST_ENDPOINT_CONTRACT.method).toBe('POST');
    expect(EVALUATION_INGEST_ENDPOINT_CONTRACT.path).toBe('/core-evaluation-transactions');
    expect(EVALUATION_INGEST_ENDPOINT_CONTRACT.auth.header).toBe('x-api-key');
    expect(EVALUATION_INGEST_ENDPOINT_CONTRACT.auth.tenantResolution).toContain('NEVER sent in the body');
    expect(EVALUATION_INGEST_ENDPOINT_CONTRACT.auth.precedent).toContain('runtime-approvals');
  });

  it('makes correlationId the idempotency key, backed by a unique index', () => {
    expect(EVALUATION_INGEST_ENDPOINT_CONTRACT.idempotency.key).toBe('correlationId');
    expect(EVALUATION_INGEST_ENDPOINT_CONTRACT.persistence.requiredIndex).toContain('correlation_id');
    expect(EVALUATION_INGEST_ENDPOINT_CONTRACT.persistence.table).toBe('core_evaluation_transactions');
  });
});
