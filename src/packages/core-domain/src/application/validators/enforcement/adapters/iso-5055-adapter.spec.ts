import {
  DEFAULT_SEMGREP_CONFIG,
  ISO_5055_TOOL,
  MEASURE_RULE_IDS,
  createIso5055Adapter,
  iso5055ViolationsFromSarif,
} from './iso-5055-adapter';
import { buildIso5055Index } from '../../standards/iso-5055-measure';
import PACK from '../../../../../../../rulesets/standards/iso-5055.rules.json';
import WEAKNESSES from '../../../../../../../rulesets/standards/iso-5055-weaknesses.json';

/**
 * GT-662 slice 2 — the pack and the adapter that measures it.
 *
 * Slice 1 proved the translation against this repository's real CodeQL findings
 * (34 of 75 open alerts are weaknesses ISO/IEC 5055 names). This file proves the
 * two things that turn that into a product: the pack's rules and the adapter's
 * output agree on rule ids, and the adapter never reports a pass it did not earn.
 */

const index = buildIso5055Index(WEAKNESSES);

/** A CodeQL-shaped log: CWEs live on the RULE, which is the case that bit slice 1. */
const codeqlLog = JSON.stringify({
  runs: [
    {
      tool: { driver: { name: 'CodeQL', rules: [{ id: 'js/sql-injection', properties: { tags: ['external/cwe/cwe-089'] } }] } },
      results: [
        {
          ruleId: 'js/sql-injection',
          locations: [{ physicalLocation: { artifactLocation: { uri: 'src/db.ts' }, region: { startLine: 42 } } }],
        },
      ],
    },
  ],
});

describe('ISO/IEC 5055 pack + adapter · GT-662 slice 2', () => {
  // --- the pack and the adapter must agree, or the findings attach to nothing --

  it("THE JOIN: every pack rule id is one the adapter can emit, and vice versa", () => {
    const packIds = (PACK as { rules: { id: string }[] }).rules.map((r) => r.id).sort();
    const emitted = Object.values(MEASURE_RULE_IDS).sort();
    expect(packIds).toEqual(emitted);
  });

  it('every pack rule routes to THIS adapter, by the tool name it registers under', () => {
    for (const rule of (PACK as { rules: { enforce?: { tool?: string; engine?: string; toolRuleId?: string; id?: string } ; id: string }[] }).rules) {
      expect(rule.enforce?.engine).toBe('enforcer');
      expect(rule.enforce?.tool).toBe(ISO_5055_TOOL);
      // The EnforcerEvaluator attaches a violation by `toolRuleId ?? id`; if
      // these disagreed the findings would be produced and then dropped.
      expect(rule.enforce?.toolRuleId).toBe(rule.id);
    }
  });

  it('the pack is NON-BLOCKING, and says why in its own text', () => {
    // Coverage here is the analyser's coverage, not the standard's. A blocking
    // rule would claim the 138 weaknesses were checked when a handful were.
    for (const rule of (PACK as { rules: { blocking: boolean; severity: string }[] }).rules) {
      expect(rule.blocking).toBe(false);
      // MUST + blocking:false is a PAIR, and both halves are load-bearing.
      // Measured: with SHOULD the CLI reported `passed` over 4 skipped rules on
      // a machine with no analyser installed — zero evaluated, zero violations,
      // green. MUST is what makes GT-569 emit the advisory that turns that into
      // `warning`; blocking:false is what stops the advisory failing a build
      // over coverage this pack never claimed.
      expect(rule.severity).toBe('MUST');
    }
    const notEvaluable = (PACK as { notEvaluableHere?: { why?: string; consequence?: string } }).notEvaluableHere;
    expect(notEvaluable?.why).toMatch(/no code parser/i);
    expect(notEvaluable?.consequence).toMatch(/does NOT mean/i);
  });

  // --- the mapping --------------------------------------------------------

  it('a CodeQL finding lands on the measure rule, carrying file, line and CWE', () => {
    const violations = iso5055ViolationsFromSarif(codeqlLog, index);
    expect(violations).toHaveLength(1);
    expect(violations[0].ruleId).toBe(MEASURE_RULE_IDS.Security);
    expect(violations[0].file).toBe('src/db.ts');
    expect(violations[0].line).toBe(42);
    expect(violations[0].message).toContain('CWE-89');
    expect(violations[0].tool).toBe('CodeQL');
  });

  it('a weakness in two measures produces a violation for BOTH', () => {
    // 197 memberships over 138 weaknesses: overlap is normal, and collapsing it
    // would under-report every shared weakness.
    const shared = index.weaknesses().find((w) => w.measures.length > 1)!;
    const log = JSON.stringify({
      runs: [{ tool: { driver: { name: 'semgrep' } }, results: [{ ruleId: 'r', properties: { cwe: [`CWE-${shared.cwe}`] } }] }],
    });
    const violations = iso5055ViolationsFromSarif(log, index);
    expect(violations).toHaveLength(shared.measures.length);
    expect(new Set(violations.map((v) => v.ruleId)).size).toBe(shared.measures.length);
  });

  it('findings the standard does not name produce NOTHING, rather than a measure', () => {
    const log = JSON.stringify({
      runs: [{ tool: { driver: { name: 'semgrep' } }, results: [{ ruleId: 'style', properties: { cwe: ['CWE-352'] } }] }],
    });
    expect(index.measuresFor(352)).toEqual([]); // checked, not assumed
    expect(iso5055ViolationsFromSarif(log, index)).toEqual([]);
  });

  it('a clean scan is an empty result, not an error', () => {
    expect(iso5055ViolationsFromSarif(JSON.stringify({ runs: [{ tool: { driver: { name: 'semgrep' } }, results: [] }] }), index)).toEqual([]);
  });

  it('AN INDEX THAT DID NOT LOAD THROWS — it never reports zero weaknesses', () => {
    // "we could not measure" and "there is nothing to report" must not collapse.
    expect(() => iso5055ViolationsFromSarif(codeqlLog, buildIso5055Index(undefined))).toThrow(/did not load/i);
  });

  // --- the invocation -----------------------------------------------------

  const ctx = (config: Record<string, string>) => ({
    satellitePath: '/repo',
    corePath: '/core',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rules: [{ id: 'ISO5055-SEC', enforce: { engine: 'enforcer', tool: ISO_5055_TOOL, config } }] as any,
  });

  it('runs a FREE scanner by default, and never `--config auto`', () => {
    const adapter = createIso5055Adapter({ run: jest.fn() } as never);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const spec = (adapter as any).config.buildSpec(ctx({}));
    expect(spec.command).toBe('semgrep');
    expect(spec.args).toContain(DEFAULT_SEMGREP_CONFIG);
    // `auto` asks the vendor's service what to run: network plus a login. A
    // governance check that silently depends on a vendor session is not free.
    expect(spec.args).not.toContain('auto');
  });

  it('a tenant that already produces SARIF is not made to scan twice', () => {
    const adapter = createIso5055Adapter({ run: jest.fn() } as never);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const spec = (adapter as any).config.buildSpec(ctx({ sarif: 'reports/codeql.sarif' }));
    expect(spec.command).toBe('cat');
    expect(spec.args).toEqual(['reports/codeql.sarif']);
  });

  it('a scanner that never produced a SARIF log is a FAILURE, not a clean run', () => {
    const adapter = createIso5055Adapter({ run: jest.fn() } as never);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const isFailure = (adapter as any).config.isToolFailure;
    expect(isFailure({ stdout: '', exitCode: 127 })).toBe(true);
    expect(isFailure({ stdout: 'command not found', exitCode: 127 })).toBe(true);
    // A completed scan writes `runs` even with zero findings.
    expect(isFailure({ stdout: JSON.stringify({ runs: [] }), exitCode: 1 })).toBe(false);
  });
});
