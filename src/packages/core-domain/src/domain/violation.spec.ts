import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import { KNOWN_RULE_ENGINES } from './contracts/evaluation-result';
import {
  buildEnforcerEvidence,
  ENFORCER_EVIDENCE_EVD_COVERAGE,
  FINDING_SEVERITY_TO_VIOLATION,
  fingerprintViolation,
  formatViolationLocation,
  isKnownEngine,
  makeViolation,
  normalizeEngine,
  normalizeViolationPath,
  VIOLATION_TO_FINDING_SEVERITY,
  VIOLATION_TO_RISK_LEVEL,
  violationToGapFinding,
  violationToRiskFinding,
  type Violation,
} from './violation';

const base: Omit<Violation, 'fingerprint' | 'frozen'> = {
  ruleId: 'HXA-01',
  tool: 'dependency-cruiser',
  file: 'src/apps/core-api/main.ts',
  line: 42,
  column: 7,
  severity: 'error',
  message: 'domain must not import infrastructure',
};

/** Walk up from this spec until we find the evidence ruleset — robust to layout depth. */
function findEvidenceRules(): { id: string; blocking: boolean }[] {
  let dir = __dirname;
  for (let i = 0; i < 8; i++) {
    const candidate = resolve(dir, 'src/rulesets/evidence/evidence-manifest.rules.json');
    if (existsSync(candidate)) return JSON.parse(readFileSync(candidate, 'utf8')).rules;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error('evidence-manifest.rules.json not found');
}

describe('Violation fingerprint (GT-511 AC2 — stable across message edits)', () => {
  it('is identical when only the message changes', () => {
    const a = makeViolation({ ...base, message: 'domain must not import infrastructure' });
    const b = makeViolation({ ...base, message: 'Domain layer cannot depend on Infrastructure!' });
    expect(a.fingerprint).toBe(b.fingerprint);
  });

  it('changes when the rule, tool, file, or coordinates change', () => {
    const ref = fingerprintViolation(base);
    expect(fingerprintViolation({ ...base, ruleId: 'HXA-02' })).not.toBe(ref);
    expect(fingerprintViolation({ ...base, tool: 'deptrac' })).not.toBe(ref);
    expect(fingerprintViolation({ ...base, file: 'src/apps/core-api/other.ts' })).not.toBe(ref);
    expect(fingerprintViolation({ ...base, line: 43 })).not.toBe(ref);
    expect(fingerprintViolation({ ...base, column: 8 })).not.toBe(ref);
  });

  it('is path-normalized (./, backslashes, dup slashes collapse to one identity)', () => {
    expect(normalizeViolationPath('.\\src//apps/core-api/main.ts')).toBe('src/apps/core-api/main.ts');
    expect(fingerprintViolation({ ...base, file: './src/apps/core-api/main.ts' })).toBe(fingerprintViolation(base));
  });

  it('is a 16-hex-char digest', () => {
    expect(makeViolation(base).fingerprint).toMatch(/^[0-9a-f]{16}$/);
  });
});

describe('makeViolation', () => {
  it('computes the fingerprint when none is supplied and defaults frozen=false', () => {
    const v = makeViolation(base);
    expect(v.fingerprint).toBe(fingerprintViolation(base));
    expect(v.frozen).toBe(false);
  });

  it('honors an explicitly supplied fingerprint and frozen flag', () => {
    const v = makeViolation({ ...base, fingerprint: 'deadbeefdeadbeef', frozen: true });
    expect(v.fingerprint).toBe('deadbeefdeadbeef');
    expect(v.frozen).toBe(true);
  });
});

describe('Severity map (GT-511 AC1)', () => {
  it('maps violation severity to finding severity and risk level', () => {
    expect(VIOLATION_TO_FINDING_SEVERITY).toEqual({ error: 'error', warning: 'warning', info: 'info' });
    expect(VIOLATION_TO_RISK_LEVEL).toEqual({ error: 'high', warning: 'medium', info: 'low' });
  });

  it('round-trips finding severity back to violation severity', () => {
    (['error', 'warning', 'info'] as const).forEach((s) => {
      expect(FINDING_SEVERITY_TO_VIOLATION[VIOLATION_TO_FINDING_SEVERITY[s]]).toBe(s);
    });
  });
});

describe('Violation ⇄ GapFinding / RiskFinding (GT-511 AC3)', () => {
  const v = makeViolation({ ...base, adrRef: 'ADR-0002' });

  it('maps to a GapFinding preserving identity, severity, message, and location', () => {
    const gap = violationToGapFinding(v);
    expect(gap.id).toBe(v.fingerprint);
    expect(gap.requirementRef).toBe('ADR-0002'); // adrRef preferred over ruleId
    expect(gap.severity).toBe('error');
    expect(gap.message).toBe(v.message);
    expect(gap.location).toBe('src/apps/core-api/main.ts:42:7');
    // round-trip: gap severity back to violation severity
    expect(FINDING_SEVERITY_TO_VIOLATION[gap.severity]).toBe(v.severity);
  });

  it('falls back to ruleId as requirementRef when no adrRef', () => {
    expect(violationToGapFinding(makeViolation(base)).requirementRef).toBe('HXA-01');
  });

  it('maps to a RiskFinding preserving identity, level, ruleRef, and location', () => {
    const risk = violationToRiskFinding(v);
    expect(risk.id).toBe(v.fingerprint);
    expect(risk.level).toBe('high');
    expect(risk.category).toBe('dependency-cruiser');
    expect(risk.ruleRef).toBe('HXA-01');
    expect(risk.location).toBe('src/apps/core-api/main.ts:42:7');
  });

  it('formats location as path / path:line / path:line:col', () => {
    expect(formatViolationLocation({ file: 'a/b.ts' })).toBe('a/b.ts');
    expect(formatViolationLocation({ file: 'a/b.ts', line: 3 })).toBe('a/b.ts:3');
    expect(formatViolationLocation({ file: 'a/b.ts', line: 3, column: 9 })).toBe('a/b.ts:3:9');
  });
});

describe('Enforcer evidence manifest (GT-511 AC3 — zero orphan EVD rules)', () => {
  const violations = [
    makeViolation({ ...base, ruleId: 'HXA-01', severity: 'error' }),
    makeViolation({ ...base, ruleId: 'HXA-02', file: 'src/x.ts', severity: 'warning' }),
    makeViolation({ ...base, ruleId: 'HXA-01', file: 'src/y.ts', severity: 'error', frozen: true }),
  ];
  const manifest = buildEnforcerEvidence({
    id: 'ev-001',
    source: 'ci',
    sourceRef: 'https://github.com/o/r/actions/runs/123',
    generatedAt: '2026-07-12T00:00:00Z',
    producer: 'dependency-cruiser@16.3.0',
    retentionPeriod: 'P90D',
    owner: '@team-arch',
    violations,
  });

  it('derives relatedRuleIds (deduped+sorted), evaluatedRules, and engine=enforcer', () => {
    expect(manifest.relatedRuleIds).toEqual(['HXA-01', 'HXA-02']);
    expect(manifest.evaluatedRules).toEqual(['HXA-01', 'HXA-02']);
    expect(manifest.engine).toBe('enforcer');
  });

  it('counts only non-frozen errors as blocking and derives status accordingly', () => {
    expect(manifest.blockingFailures).toBe(1); // frozen HXA-01 error excluded
    expect(manifest.status).toBe('fail');
    expect(buildEnforcerEvidence({ ...minimal(), violations: [makeViolation({ ...base, severity: 'warning' })] }).status).toBe('warn');
    expect(buildEnforcerEvidence({ ...minimal(), violations: [] }).status).toBe('pass');
    expect(buildEnforcerEvidence({ ...minimal(), violations: [makeViolation({ ...base, severity: 'error', frozen: true })] }).status).toBe('pass');
  });

  it('every EVD rule in the ruleset is covered by a manifest field (no orphan rules)', () => {
    const evdRules = findEvidenceRules();
    for (const rule of evdRules) {
      expect(ENFORCER_EVIDENCE_EVD_COVERAGE[rule.id]).toBeDefined();
    }
    // and the coverage map declares no EVD ids the ruleset doesn't have
    const ruleIds = new Set(evdRules.map((r) => r.id));
    for (const covered of Object.keys(ENFORCER_EVIDENCE_EVD_COVERAGE)) {
      expect(ruleIds.has(covered)).toBe(true);
    }
  });

  it('a built manifest carries every field required by each MUST/blocking EVD rule', () => {
    const evdRules = findEvidenceRules();
    const record = manifest as unknown as Record<string, unknown>;
    for (const rule of evdRules) {
      if (!rule.blocking) continue; // EVD-04 is SHOULD (non-blocking) — optional fields
      for (const field of ENFORCER_EVIDENCE_EVD_COVERAGE[rule.id]) {
        expect(record[field]).toBeDefined();
      }
    }
  });
});

describe('Rule-engine open vocabulary (GT-511 tolerance strategy)', () => {
  it('recognizes known engines and tolerates unknown ones without throwing', () => {
    expect(KNOWN_RULE_ENGINES).toContain('enforcer');
    expect(isKnownEngine('enforcer')).toBe(true);
    expect(isKnownEngine('opa')).toBe(true);
    expect(isKnownEngine('some-future-engine')).toBe(false);
    expect(normalizeEngine('some-future-engine')).toBe('some-future-engine');
    expect(normalizeEngine('enforcer')).toBe('enforcer');
  });
});

/** A minimal valid build input (violations supplied per-test). */
function minimal() {
  return {
    id: 'ev-x',
    source: 'cli',
    sourceRef: 'evolith enforce compile',
    generatedAt: '2026-07-12T00:00:00Z',
    producer: 'dependency-cruiser@16.3.0',
    violations: [] as Violation[],
  };
}
