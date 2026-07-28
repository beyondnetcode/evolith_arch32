import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseBoard,
  validateRuntimeEvidence,
  auditIsoRatings,
  auditAssessmentRatings,
  bandFor,
  rateCapability,
  rateIndicator,
  selfTestIsoRatingRule,
  ISO_33020_SCALE,
  STATE_WEIGHT,
} from './ci/09-reconcile-maturity.mjs';

test('parseBoard derives status totals and freshness from the canonical table', () => {
  const result = parseBoard(`**Last Updated:** 2026-06-13
| [\`GT-41\`](./catalog.md#gt-41) | Reconcile | Cross | P1 | M | \`DONE\` |
| [\`GT-42\`](./catalog.md#gt-42) | Contracts | Cross | P1 | M | \`PENDING\` |
`);
  assert.deepEqual(result, {
    lastUpdated: '2026-06-13',
    counts: { total: 2, done: 1, pending: 1, inProgress: 0, deferred: 0 },
  });
});

test('parseBoard rejects content without canonical evidence', () => {
  assert.throws(() => parseBoard('# Narrative only'), /Could not parse/);
});

test('runtime evidence accepts fresh PASS and gap-backed BLOCKED checks', () => {
  const content = `**Last Updated:** 2026-06-13
| [\`GT-41\`](./catalog.md#gt-41) | Reconcile | Cross | P0 | M | \`PENDING\` |
`;
  const board = { ...parseBoard(content), content };
  const base = {
    observedAt: '2026-06-13',
    commit: 'ae21c92',
    source: 'https://github.com/beyondnetcode/evolith_arch32/actions/runs/1',
    summary: 'Evidence',
  };
  const evidence = {
    schemaVersion: '1.0.0',
    asOf: '2026-06-13',
    checks: [
      { ...base, id: 'cli-baseline', status: 'PASS' },
      { ...base, id: 'coverage', status: 'BLOCKED', gap: 'GT-41' },
      { ...base, id: 'documentation', status: 'PASS' },
      { ...base, id: 'release', status: 'BLOCKED', gap: 'GT-41' },
    ],
  };
  assert.deepEqual(
    validateRuntimeEvidence(evidence, board, process.cwd(), new Date('2026-06-13T12:00:00Z')),
    [],
  );
});

test('runtime evidence accepts RESOLVED checks mapped to a closed gap without a run URL', () => {
  const content = `**Last Updated:** 2026-06-13
| [\`GT-41\`](./catalog.md#gt-41) | Reconcile | Cross | P0 | M | \`DONE\` |
| [\`GT-42\`](./catalog.md#gt-42) | Pending | Cross | P0 | M | \`PENDING\` |
`;
  const board = { ...parseBoard(content), content };
  const base = {
    observedAt: '2026-06-13',
    commit: 'ae21c92',
    source: 'https://github.com/beyondnetcode/evolith_arch32/actions/runs/1',
    summary: 'Evidence',
  };
  const evidence = {
    schemaVersion: '1.0.0',
    asOf: '2026-06-13',
    checks: [
      { ...base, id: 'cli-baseline', status: 'PASS' },
      { ...base, id: 'coverage', status: 'BLOCKED', gap: 'GT-42' },
      { ...base, id: 'documentation', status: 'PASS' },
      { id: 'release', status: 'RESOLVED', gap: 'GT-41', observedAt: '2026-06-13', commit: 'ae21c92', summary: 'Resolved in code' },
    ],
  };
  assert.deepEqual(
    validateRuntimeEvidence(evidence, board, process.cwd(), new Date('2026-06-13T12:00:00Z')),
    [],
  );
});

test('runtime evidence rejects RESOLVED checks mapped to an open gap', () => {
  const content = `**Last Updated:** 2026-06-13
| [\`GT-41\`](./catalog.md#gt-41) | Reconcile | Cross | P0 | M | \`PENDING\` |
`;
  const board = { ...parseBoard(content), content };
  const evidence = {
    schemaVersion: '1.0.0',
    asOf: '2026-06-13',
    checks: [
      { id: 'release', status: 'RESOLVED', gap: 'GT-41', observedAt: '2026-06-13', commit: 'ae21c92', summary: 'Resolved in code' },
    ],
  };
  const errors = validateRuntimeEvidence(evidence, board, process.cwd(), new Date('2026-06-13T12:00:00Z'));
  assert.ok(errors.some((error) => error.includes('must map RESOLVED evidence to a closed gap')));
});

test('runtime evidence rejects stale and unowned blockers', () => {
  const content = `**Last Updated:** 2026-06-13
| [\`GT-41\`](./catalog.md#gt-41) | Reconcile | Cross | P0 | M | \`PENDING\` |
`;
  const board = { ...parseBoard(content), content };
  const evidence = {
    schemaVersion: '1.0.0',
    asOf: '2026-06-13',
    checks: [
      {
        id: 'cli-baseline',
        status: 'BLOCKED',
        gap: 'GT-99',
        observedAt: '2026-01-01',
        commit: 'missing00',
        source: 'invalid',
        summary: '',
      },
    ],
  };
  const errors = validateRuntimeEvidence(evidence, board, process.cwd(), new Date('2026-06-13T12:00:00Z'));
  assert.ok(errors.some((error) => error.includes('stale')));
  assert.ok(errors.some((error) => error.includes('active gap')));
  assert.ok(errors.some((error) => error.includes('Missing required maturity check')));
});

// ---------------------------------------------------------------------------
// GT-596 — ISO/IEC 33020:2019 rating scale
// ---------------------------------------------------------------------------

/** A capability block in the shape the assessment actually uses. */
const capability = ({ state = 'Validated', rating = 'F', evidence = [] }) => [
  '### Pillar 1: Security & Compliance — **Level 4 (Managed)**',
  `* **State:** \`${state}\``,
  `* **ISO/IEC 33020:2019 rating:** \`${rating}\` — recomputed by the gate.`,
  '* **Evidence:**',
  ...evidence.map((line) => `  * ${line}`),
  '* **Path to Level 5:** automated penetration testing in CI.',
].join('\n');

const EXECUTABLE = 'CodeQL — job `codeql-analysis` at `.github/workflows/sdk-cli-ci.yml:362`.';
const ADR_ONLY = 'Isolation via RLS ([ADR-0010](../../architecture/adrs/core/0010-multi-tenancy-architecture-strategy.md)).';
const UNSUPPORTED = 'Load testing is planned for a later phase.';

test('the ISO/IEC 33020:2019 bands are the published ones, and their boundaries are closed at the top', () => {
  assert.deepEqual(ISO_33020_SCALE.map((band) => [band.letter, band.lower, band.upper]), [
    ['N', 0, 15], ['P', 15, 50], ['L', 50, 85], ['F', 85, 100],
  ]);
  // The boundaries are where over-claiming happens: 15 is `N`, 50 is `P`, 85 is `L`.
  assert.equal(bandFor(0).letter, 'N');
  assert.equal(bandFor(15).letter, 'N');
  assert.equal(bandFor(15.1).letter, 'P');
  assert.equal(bandFor(50).letter, 'P');
  assert.equal(bandFor(50.1).letter, 'L');
  assert.equal(bandFor(85).letter, 'L');
  assert.equal(bandFor(85.1).letter, 'F');
  assert.equal(bandFor(100).letter, 'F');
});

test('every Evidence-Backed State has a weight in both editions, and the ladder is order-preserving', () => {
  for (const [en, es] of [['visioned', 'visionado'], ['designed', 'diseñado'], ['prototyped', 'prototipado'],
    ['implemented', 'implementado'], ['validated', 'validado'], ['scaled', 'escalado']]) {
    assert.equal(STATE_WEIGHT.get(en), STATE_WEIGHT.get(es), `${en}/${es} must weigh the same`);
  }
  assert.deepEqual(
    ['visioned', 'designed', 'prototyped', 'implemented', 'validated', 'scaled'].map((s) => STATE_WEIGHT.get(s)),
    [0.0, 0.2, 0.5, 0.8, 1.0, 1.2],
  );
});

test('an indicator is weighed by what backs it, and an ADR link target is never a file citation', () => {
  assert.equal(rateIndicator(EXECUTABLE), 1.0);
  assert.equal(rateIndicator('Telemetry — `NodeSDK` at `src/apps/core-api/src/tracing.ts:7`.'), 1.0);
  assert.equal(rateIndicator(ADR_ONLY), 0.2);
  assert.equal(rateIndicator(UNSUPPORTED), 0.0);
  // The loophole that would silently reopen GT-576: a link target full of digits.
  assert.equal(rateIndicator('See [ADR-0010](../../adrs/core/0010-multi-tenancy-architecture-strategy.md)'), 0.2);
});

test('achievement is recomputed from the indicators, not read from the document', () => {
  const rated = rateCapability(capability({ evidence: [EXECUTABLE, ADR_ONLY, ADR_ONLY, UNSUPPORTED] }));
  assert.equal(rated.indicators, 4);
  assert.equal(rated.percent, 35);            // (1 + 0.2 + 0.2 + 0) / 4
  assert.equal(rated.band.letter, 'P');
});

test('a rating whose evidence does not cross its threshold is rejected — the GT-576 defect, mechanised', () => {
  const audit = auditIsoRatings(capability({ evidence: [ADR_ONLY, ADR_ONLY] }), 'test');
  assert.equal(audit.violations.length, 1);
  assert.equal(audit.violations[0].rule, 'threshold-not-crossed');
  assert.match(audit.violations[0].detail, /20% .* does not cross `F` \(>85%\)/);
});

test('a single executable citation does not buy `F` for a block of five indicators', () => {
  const audit = auditIsoRatings(
    capability({ evidence: [EXECUTABLE, ADR_ONLY, ADR_ONLY, ADR_ONLY, ADR_ONLY] }), 'test');
  assert.deepEqual(audit.violations.map((v) => v.rule), ['threshold-not-crossed']);
});

test('exactly 50% is `P`, never `L`', () => {
  const onTheBoundary = capability({ state: 'Implemented', rating: 'L', evidence: [EXECUTABLE, UNSUPPORTED] });
  assert.equal(rateCapability(onTheBoundary).percent, 50);
  assert.deepEqual(auditIsoRatings(onTheBoundary, 'test').violations.map((v) => v.rule), ['threshold-not-crossed']);
});

test('a letter that does not belong to its state is rejected whatever the evidence says', () => {
  const audit = auditIsoRatings(
    capability({ state: 'Implemented', rating: 'F', evidence: [EXECUTABLE, EXECUTABLE] }), 'test');
  assert.deepEqual(audit.violations.map((v) => v.rule), ['band-mismatch']);
});

test('a state with no declared rating is rejected — silence must not read as compliance', () => {
  const audit = auditIsoRatings([
    '### Pillar 1: Security & Compliance',
    '* **State:** `Validated`',
    `* **Evidence:** ${EXECUTABLE}`,
  ].join('\n'), 'test');
  assert.deepEqual(audit.violations.map((v) => v.rule), ['missing-rating']);
});

test('a rating declared over zero indicators is rejected', () => {
  const audit = auditIsoRatings([
    '### Pillar 1: Security & Compliance',
    '* **State:** `Validated`',
    '* **ISO/IEC 33020:2019 rating:** `F`',
    '* **Path to Level 5:** automated penetration testing in CI.',
  ].join('\n'), 'test');
  assert.deepEqual(audit.violations.map((v) => v.rule), ['no-indicators']);
});

test('the Spanish edition is policed identically — it is a published surface, not a translation artifact', () => {
  const audit = auditIsoRatings([
    '### Pilar 1: Seguridad y Compliance',
    '* **Estado:** `Validado`',
    '* **Calificación ISO/IEC 33020:2019:** `F` — recalculada por el gate.',
    '* **Evidencia:**',
    '  * Aislamiento vía RLS ([ADR-0010](../../adrs/core/0010-multi-tenancy-architecture-strategy.es.md)).',
  ].join('\n'), 'test');
  assert.deepEqual(audit.violations.map((v) => v.rule), ['threshold-not-crossed']);
});

test('the rule is one-sided: under-claiming stays legal so GT-576-style downgrades remain valid', () => {
  const conservative = capability({ state: 'Designed', rating: 'P', evidence: [EXECUTABLE, EXECUTABLE] });
  assert.equal(rateCapability(conservative).percent, 100);
  assert.deepEqual(auditIsoRatings(conservative, 'test').violations, []);
});

test('a state table row whose letter contradicts its state is rejected, and section 5 is left alone', () => {
  const audit = auditIsoRatings([
    '## 5. Adapter Capability Maturity',
    '| **Agent Engine** | Replaceable reasoning. | `Implemented` | Medium |',
    '## 6. Pattern Maturity Matrix',
    '| **Integration** | **Strangler Fig** | Critical | `Validated` | `L` | Rationale. |',
    '| **Scalability** | **CQRS** | Optional | `Visioned` | `N` | Read-models on demand. |',
  ].join('\n'), 'test');
  assert.equal(audit.rows, 2, 'only the section 6 rows are rated; the section 5 inventory is not');
  assert.deepEqual(audit.violations.map((v) => v.rule), ['band-mismatch']);
});

test('the in-script negative self-test runs the rule against deliberately bad input on every invocation', () => {
  assert.deepEqual(selfTestIsoRatingRule(), { assertions: 12 });
});

test('both shipped editions carry a rating that its own evidence sustains', () => {
  const audit = auditAssessmentRatings();
  assert.deepEqual(audit.violations, []);
  // Anti-vacuous: a clean verdict over zero parsed blocks is not a clean document.
  assert.ok(audit.scanned >= 20, `expected both editions to parse, scanned ${audit.scanned}`);
  assert.ok(audit.rows >= 26, `expected both editions' state tables to parse, rows ${audit.rows}`);
  assert.equal(audit.ratings.length, audit.scanned);
});
