import type { NormalizedRule } from '../../domain/models/normalized-rule';
import {
  applyRuleOverrides,
  emptyOverridesReport,
  isOverrideExpired,
  normaliseOverrideSeverity,
  FATAL_OVERRIDE_CODES,
  RuleOverridesInput,
} from './rule-overrides';

/**
 * GT-678 — the per-rule override policy, pure and clock-injected.
 *
 * The invariant every case below defends: an override either CHANGES the run
 * and is named in `applied` (from -> to, approver, expiry, source), or changes
 * NOTHING and is named in `rejected` with a code. There is no third state in
 * which a delta is quietly dropped, because that third state — an authored
 * `enabled: false` accepted by the schema and discarded by the loader — is the
 * defect this row records.
 */

const NOW = new Date('2026-09-19T12:00:00Z');

const rule = (id: string, over: Partial<NormalizedRule> = {}): NormalizedRule => ({
  id,
  sourceFile: 'acl/anti-corruption-layer.rules.json',
  severity: 'MUST',
  category: 'anti-corruption',
  title: id,
  description: '',
  blocking: true,
  ...over,
});

const doc = (rules: RuleOverridesInput['document']['rules'], source = 'governance/rule-overrides.json'): RuleOverridesInput => ({
  source,
  document: {
    tenantId: 'acme',
    version: '1.0.0',
    effectiveDate: '2026-09-01',
    approvedBy: 'cto@acme.example',
    rules,
  },
});

describe('applyRuleOverrides · GT-678', () => {
  it('a clean run reports EMPTY, never absent', () => {
    const corpus = [rule('ACL-02'), rule('ACL-03', { blocking: false, severity: 'SHOULD' })];
    const out = applyRuleOverrides(corpus, undefined, NOW);
    expect(out.applied).toEqual([]);
    expect(out.rejected).toEqual([]);
    expect(out.disabled).toEqual([]);
    expect(out.rules).toEqual(corpus);
    expect(emptyOverridesReport()).toEqual({ applied: [], rejected: [] });
  });

  describe('the blocking-criterion policy (the named rejection the catalogue demands)', () => {
    it('OBSERVED FAILING: `blocking: false` on a blocking rule without approver + expiry is OVR-BLOCKING-REMOVED and the Core values stand', () => {
      const out = applyRuleOverrides(
        [rule('ACL-02')],
        doc({ 'ACL-02': { blocking: false, rationale: 'we accept the risk' } }),
        NOW,
      );
      expect(out.applied).toEqual([]);
      expect(out.rejected).toHaveLength(1);
      expect(out.rejected[0]).toMatchObject({
        code: 'OVR-BLOCKING-REMOVED',
        ruleId: 'ACL-02',
        source: 'governance/rule-overrides.json',
      });
      expect(out.rejected[0].message).toMatch(/without approvedBy and expiresOn/);
      // Nothing was loosened: the rule is evaluated exactly as the Core declared it.
      expect(out.rules[0]).toMatchObject({ id: 'ACL-02', blocking: true, severity: 'MUST' });
      expect(FATAL_OVERRIDE_CODES.has(out.rejected[0].code)).toBe(true);
    });

    it('`enabled: false` on a blocking rule with an approver but no expiry is still OVR-BLOCKING-REMOVED (a waiver is time-boxed)', () => {
      const out = applyRuleOverrides(
        [rule('ACL-02')],
        doc({ 'ACL-02': { enabled: false, rationale: 'r', approvedBy: 'cto@acme.example' } }),
        NOW,
      );
      expect(out.rejected.map((r) => r.code)).toEqual(['OVR-BLOCKING-REMOVED']);
      expect(out.rejected[0].message).toMatch(/without expiresOn/);
      expect(out.disabled).toEqual([]);
      expect(out.rules).toHaveLength(1);
    });

    it('the same waiver WITH approver and expiry is applied and recorded with both', () => {
      const out = applyRuleOverrides(
        [rule('ACL-02')],
        doc({
          'ACL-02': {
            blocking: false,
            severity: 'SHOULD',
            rationale: 'gateway validates',
            approvedBy: 'cto@acme.example',
            expiresOn: '2026-12-31',
          },
        }),
        NOW,
      );
      expect(out.rejected).toEqual([]);
      expect(out.applied).toEqual([
        {
          ruleId: 'ACL-02',
          field: 'severity',
          from: 'MUST',
          to: 'SHOULD',
          approvedBy: 'cto@acme.example',
          expiresOn: '2026-12-31',
          source: 'governance/rule-overrides.json',
        },
        {
          ruleId: 'ACL-02',
          field: 'blocking',
          from: true,
          to: false,
          approvedBy: 'cto@acme.example',
          expiresOn: '2026-12-31',
          source: 'governance/rule-overrides.json',
        },
      ]);
      // Reported ONCE, at the overridden severity.
      expect(out.rules.filter((r) => r.id === 'ACL-02')).toEqual([
        expect.objectContaining({ id: 'ACL-02', severity: 'SHOULD', blocking: false }),
      ]);
    });

    it('a severity-only downgrade of a blocking rule needs an approver (no expiry) — OVR-UNAPPROVED-DOWNGRADE without it', () => {
      const without = applyRuleOverrides([rule('ACL-02')], doc({ 'ACL-02': { severity: 'SHOULD', rationale: 'r' } }), NOW);
      expect(without.rejected.map((r) => r.code)).toEqual(['OVR-UNAPPROVED-DOWNGRADE']);
      expect(without.rules[0].severity).toBe('MUST');
      expect(FATAL_OVERRIDE_CODES.has('OVR-UNAPPROVED-DOWNGRADE')).toBe(true);

      const withApprover = applyRuleOverrides(
        [rule('ACL-02')],
        doc({ 'ACL-02': { severity: 'SHOULD', rationale: 'r', approvedBy: 'lead@acme.example' } }),
        NOW,
      );
      expect(withApprover.rejected).toEqual([]);
      expect(withApprover.applied).toEqual([
        expect.objectContaining({ field: 'severity', from: 'MUST', to: 'SHOULD', approvedBy: 'lead@acme.example' }),
      ]);
      expect(withApprover.applied[0]).not.toHaveProperty('expiresOn');
    });

    it('a NON-blocking rule can be disabled or downgraded with a rationale alone', () => {
      const out = applyRuleOverrides(
        [rule('ACL-03', { blocking: false, severity: 'SHOULD' })],
        doc({ 'ACL-03': { enabled: false, rationale: 'not relevant to a CLI' } }),
        NOW,
      );
      expect(out.rejected).toEqual([]);
      expect(out.applied).toEqual([
        { ruleId: 'ACL-03', field: 'enabled', from: true, to: false, source: 'governance/rule-overrides.json' },
      ]);
      expect(out.rules).toEqual([]);
      expect(out.disabled.map((r) => r.id)).toEqual(['ACL-03']);
    });

    it('hardening is always allowed and always recorded', () => {
      const out = applyRuleOverrides(
        [rule('ACL-03', { blocking: false, severity: 'SHOULD' })],
        doc({ 'ACL-03': { severity: 'MUST', blocking: true, rationale: 'we hold ourselves to it' } }),
        NOW,
      );
      expect(out.rejected).toEqual([]);
      expect(out.applied.map((a) => [a.field, a.from, a.to])).toEqual([
        ['severity', 'SHOULD', 'MUST'],
        ['blocking', false, true],
      ]);
      expect(out.rules[0]).toMatchObject({ severity: 'MUST', blocking: true });
    });
  });

  describe('what changes nothing is still named', () => {
    it('an expired override is OVR-EXPIRED; the day of expiry is still in force (inclusive, UTC)', () => {
      const expired = applyRuleOverrides(
        [rule('ACL-03', { blocking: false, severity: 'SHOULD' })],
        doc({ 'ACL-03': { enabled: false, rationale: 'r', expiresOn: '2026-09-18' } }),
        NOW,
      );
      expect(expired.rejected.map((r) => r.code)).toEqual(['OVR-EXPIRED']);
      expect(expired.rules).toHaveLength(1);

      const stillInForce = applyRuleOverrides(
        [rule('ACL-03', { blocking: false, severity: 'SHOULD' })],
        doc({ 'ACL-03': { enabled: false, rationale: 'r', expiresOn: '2026-09-19' } }),
        NOW,
      );
      expect(stillInForce.rejected).toEqual([]);
      expect(stillInForce.disabled).toHaveLength(1);

      expect(isOverrideExpired('2026-09-19', new Date('2026-09-19T23:59:59Z'))).toBe(false);
      expect(isOverrideExpired('2026-09-19', new Date('2026-09-20T00:00:00Z'))).toBe(true);
      // An unreadable date is EXPIRED — a waiver nobody can date is not a waiver.
      expect(isOverrideExpired('soon', NOW)).toBe(true);
    });

    it('an id the corpus does not carry is OVR-UNKNOWN-RULE, judged against the WHOLE corpus, not the selection', () => {
      const corpus = [rule('ACL-02'), rule('SSDF-1', { sourceFile: 'standards/ssdf.rules.json', blocking: false, severity: 'SHOULD' })];
      const selected = [corpus[0]];
      const out = applyRuleOverrides(
        selected,
        doc({
          'ACL-2': { enabled: false, rationale: 'typo' },
          'SSDF-1': { enabled: false, rationale: 'not selected this run' },
        }),
        NOW,
        { corpus },
      );
      expect(out.rejected.map((r) => [r.code, r.ruleId])).toEqual([
        ['OVR-UNKNOWN-RULE', 'ACL-2'],
        ['OVR-NOT-SELECTED', 'SSDF-1'],
      ]);
      expect(out.applied).toEqual([]);
      expect(FATAL_OVERRIDE_CODES.has('OVR-UNKNOWN-RULE')).toBe(false);
    });

    it('an override that sets only current values is OVR-NOOP', () => {
      const out = applyRuleOverrides(
        [rule('ACL-02')],
        doc({ 'ACL-02': { severity: 'MUST', blocking: true, enabled: true, rationale: 'r' } }),
        NOW,
      );
      expect(out.rejected.map((r) => r.code)).toEqual(['OVR-NOOP']);
      expect(out.applied).toEqual([]);
    });

    it('a severity the engine cannot represent is OVR-INVALID-SEVERITY; SHOULD NOT collapses to SHOULD like the loader', () => {
      const bad = applyRuleOverrides(
        [rule('ACL-03', { blocking: false, severity: 'SHOULD' })],
        doc({ 'ACL-03': { severity: 'warning', rationale: 'r' } }),
        NOW,
      );
      expect(bad.rejected.map((r) => r.code)).toEqual(['OVR-INVALID-SEVERITY']);

      expect(normaliseOverrideSeverity('SHOULD NOT')).toBe('SHOULD');
      expect(normaliseOverrideSeverity('may')).toBe('COULD');
      expect(normaliseOverrideSeverity('warning')).toBeUndefined();
      const collapsed = applyRuleOverrides(
        [rule('ACL-04', { blocking: false, severity: 'COULD' })],
        doc({ 'ACL-04': { severity: 'SHOULD NOT', rationale: 'r' } }),
        NOW,
      );
      expect(collapsed.applied).toEqual([expect.objectContaining({ field: 'severity', from: 'COULD', to: 'SHOULD' })]);
    });
  });

  describe('the two corpus-side entry paths go through the SAME policy', () => {
    it("a rule's own `enabled: false` disables it and is reported with its file as source, no approval demanded", () => {
      const out = applyRuleOverrides([rule('ACL-02', { enabled: false })], undefined, NOW);
      expect(out.applied).toEqual([
        { ruleId: 'ACL-02', field: 'enabled', from: true, to: false, source: 'acl/anti-corruption-layer.rules.json' },
      ]);
      expect(out.rules).toEqual([]);
      expect(out.disabled.map((r) => r.id)).toEqual(['ACL-02']);
    });

    it('a tenant pack delta (corpusOverride) is applied under the blocking policy and named with the pack as source', () => {
      const withTenant = rule('ACL-02', {
        corpusOverride: {
          source: 'tenants/acme/pack.rules.json',
          delta: { severity: 'SHOULD', blocking: false, rationale: 'r' },
        },
      });
      const refused = applyRuleOverrides([withTenant], undefined, NOW);
      expect(refused.rejected).toEqual([
        expect.objectContaining({ code: 'OVR-BLOCKING-REMOVED', ruleId: 'ACL-02', source: 'tenants/acme/pack.rules.json' }),
      ]);
      expect(refused.rules[0]).toMatchObject({ severity: 'MUST', blocking: true });

      const approved = rule('ACL-02', {
        corpusOverride: {
          source: 'tenants/acme/pack.rules.json',
          delta: { severity: 'SHOULD', blocking: false, rationale: 'r', approvedBy: 'cto', expiresOn: '2099-01-01' },
        },
      });
      const ok = applyRuleOverrides([approved], undefined, NOW);
      expect(ok.rejected).toEqual([]);
      expect(ok.applied.map((a) => a.source)).toEqual(['tenants/acme/pack.rules.json', 'tenants/acme/pack.rules.json']);
      expect(ok.rules[0]).toMatchObject({ severity: 'SHOULD', blocking: false });
    });

    it('a document override on top of a tenant pack records from -> to against the ALREADY softened rule', () => {
      const approved = rule('ACL-02', {
        corpusOverride: {
          source: 'tenants/acme/pack.rules.json',
          delta: { severity: 'SHOULD', rationale: 'r', approvedBy: 'cto' },
        },
      });
      const out = applyRuleOverrides([approved], doc({ 'ACL-02': { severity: 'COULD', rationale: 'r' } }), NOW);
      // SHOULD -> COULD on a still-blocking rule is a downgrade: it needs an approver.
      expect(out.rejected.map((r) => r.code)).toEqual(['OVR-UNAPPROVED-DOWNGRADE']);
      expect(out.applied).toEqual([expect.objectContaining({ from: 'MUST', to: 'SHOULD', source: 'tenants/acme/pack.rules.json' })]);
    });
  });

  it('preserves corpus order and strips the bookkeeping fields from what leaves', () => {
    const corpus = [
      rule('B-1', { blocking: false, severity: 'SHOULD', enabled: false }),
      rule('A-1', { corpusOverride: { source: 'tenants/t/p.rules.json', delta: { severity: 'MUST NOT', rationale: 'r' } } }),
      rule('C-1', { blocking: false, severity: 'COULD' }),
    ];
    const out = applyRuleOverrides(corpus, undefined, NOW);
    expect(out.rules.map((r) => r.id)).toEqual(['A-1', 'C-1']);
    expect(out.disabled.map((r) => r.id)).toEqual(['B-1']);
    for (const r of [...out.rules, ...out.disabled]) {
      expect(r).not.toHaveProperty('enabled');
      expect(r).not.toHaveProperty('corpusOverride');
    }
    // MUST -> MUST NOT is a lateral change (same rank), not a downgrade.
    expect(out.rejected).toEqual([]);
    expect(out.rules[0].severity).toBe('MUST NOT');
  });
});
