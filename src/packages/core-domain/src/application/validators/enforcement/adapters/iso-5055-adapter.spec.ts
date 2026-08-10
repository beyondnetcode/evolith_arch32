import {
  DEFAULT_ESLINT_COMMAND,
  DEFAULT_ESLINT_SARIF_FORMATTER,
  DEFAULT_SEMGREP_CONFIG,
  ISO_5055_TOOL,
  MEASURE_RULE_IDS,
  createIso5055Adapter,
  eslintJsonToSarif,
  iso5055ViolationsFromSarif,
  relativizeSarifUri,
} from './iso-5055-adapter';
import { buildIso5055Index } from '../../standards/iso-5055-measure';
import { buildEslintCweMap } from '../../standards/eslint-cwe-map';
import { ESLINT_CWE_MAP } from '../../standards/eslint-cwe-map.generated';
import { describeIso5055Coverage, iso5055CoverageFromSarif } from '../../standards/iso-5055-coverage';
import { DEFAULT_SANDBOX_POLICY, enforceSandboxPolicy } from '../provisioning';
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
    // GT-663: no MEASURE violation is produced. What comes back instead is the
    // single coverage advisory below — because a run that found nothing is
    // exactly when a reader needs the denominator.
    const out = iso5055ViolationsFromSarif(log, index);
    expect(out.filter((v) => v.severity !== 'warning')).toEqual([]);
  });

  it('GT-663: a clean scan returns the DENOMINATOR, not silence', () => {
    // It used to return `[]`, and `[]` reads as "nothing wrong" whether the
    // analyser looks for all 138 weaknesses or for none of them. One advisory,
    // once, naming the floor as a floor.
    const out = iso5055ViolationsFromSarif(
      JSON.stringify({ runs: [{ tool: { driver: { name: 'semgrep' } }, results: [] }] }),
      index,
    );
    expect(out).toHaveLength(1);
    expect(out[0].severity).toBe('warning');
    expect(out[0].message).toContain('0 of the 138');
    expect(out[0].message).toContain('FLOOR');
  });

  it('GT-663: when there ARE findings the caveat is NOT repeated per finding', () => {
    // Repeating it would train a reader to skip it, and they already have
    // something concrete to act on.
    const out = iso5055ViolationsFromSarif(codeqlLog, index);
    expect(out.filter((v) => v.severity === 'warning')).toHaveLength(0);
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

/**
 * GT-664 — the ESLint producer.
 *
 * GT-662 measured what the CWE-tagging analysers reach on this repository:
 * CodeQL 10 of the 138 weaknesses, semgrep `p/default` 3 — and Reliability and
 * Performance Efficiency at zero in both. ESLint is already installed in every
 * JS/TS satellite and can decide defects those two never look for, but it tags
 * nothing with a CWE, so the mapping has to be supplied by a hand-written table.
 * These tests hold the line that makes that acceptable: the table's findings
 * stay labelled as OUR claim, wherever they surface.
 */
describe('ISO/IEC 5055 · the ESLint producer · GT-664', () => {
  const ctx = (config: Record<string, string>) => ({
    satellitePath: '/repo',
    corePath: '/core',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rules: [{ id: 'ISO5055-SEC', enforce: { engine: 'enforcer', tool: ISO_5055_TOOL, config } }] as any,
  });
  const cweMap = buildEslintCweMap(ESLINT_CWE_MAP);

  /** An ESLint-shaped log: real driver name, real rule table, and NO CWE anywhere. */
  const eslintLog = (ruleId: string, uri = 'file:///repo/src/switch.ts') =>
    JSON.stringify({
      runs: [
        {
          tool: { driver: { name: 'ESLint', rules: [{ id: ruleId, properties: {} }] } },
          results: [
            {
              ruleId,
              locations: [{ physicalLocation: { artifactLocation: { uri }, region: { startLine: 7 } } }],
            },
          ],
        },
      ],
    });

  // --- the invocation -------------------------------------------------------

  it('the tenant NAMES the analyser; there is no fallback chain behind it', () => {
    const adapter = createIso5055Adapter({ run: jest.fn() } as never);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const build = (adapter as any).config.buildSpec;
    expect(build(ctx({ analyser: 'eslint' })).command).toBe(DEFAULT_ESLINT_COMMAND);
    // Absent ⇒ semgrep, exactly as GT-662 shipped it. A tool answering for one
    // that was never installed would still be reported as one measurement.
    expect(build(ctx({})).command).toBe('semgrep');
  });

  it('asks ESLint for a report it can already produce, so the path needs NO extra package', () => {
    // Measured: adding @microsoft/eslint-formatter-sarif to this monorepo pulled
    // 38 packages, a nested ESLint 8 beside our 9, and a `jschardet: latest` that
    // cannot be pinned — to reformat a report ESLint emits natively. A tenant
    // that already has it says so and loses nothing.
    const adapter = createIso5055Adapter({ run: jest.fn() } as never);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const build = (adapter as any).config.buildSpec;
    expect(build(ctx({ analyser: 'eslint' })).args).toEqual(['.', '--format', 'json']);
    expect(build(ctx({ analyser: 'eslint' })).cwd).toBe('/repo');
    expect(build(ctx({ analyser: 'eslint', eslintFormat: 'sarif' })).args).toEqual([
      '.', '--format', DEFAULT_ESLINT_SARIF_FORMATTER,
    ]);
  });

  it("ESLint's own JSON becomes the SAME canonical shape, not a second parser", () => {
    // The ACL that keeps one translation for many producers. A finding from
    // ESLint and a finding from CodeQL are classified by the same code, so the
    // two cannot quietly disagree about what a measure means.
    const json = JSON.stringify([
      { filePath: '/repo/src/switch.ts', messages: [{ ruleId: 'no-fallthrough', line: 7 }] },
    ]);
    const violations = iso5055ViolationsFromSarif(eslintJsonToSarif(json)!, index, {
      cweMap,
      basePath: '/repo',
    });
    expect(violations.map((v) => v.ruleId)).toContain(MEASURE_RULE_IDS.Reliability);
    expect(violations[0].file).toBe('src/switch.ts');
    expect(violations[0].line).toBe(7);
    // A SARIF log is left alone — the normaliser only claims ESLint's array shape.
    expect(eslintJsonToSarif(codeqlLog)).toBeUndefined();
  });

  it('an ESLint run that found nothing is a CLEAN RUN; one that never started is not', () => {
    const adapter = createIso5055Adapter({ run: jest.fn() } as never);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const isFailure = (adapter as any).config.isToolFailure;
    expect(isFailure({ stdout: '[]', exitCode: 0 })).toBe(false); // clean lint
    expect(isFailure({ stdout: '', exitCode: 127 })).toBe(true); // binary missing
    expect(isFailure({ stdout: 'Oops! Something went wrong', exitCode: 2 })).toBe(true); // config error
  });

  it('a local binary is reachable without widening the sandbox allowlist', () => {
    // `enforceSandboxPolicy` matches on BASENAME, so a path to the satellite's
    // own ESLint resolves to the same permitted binary.
    const adapter = createIso5055Adapter({ run: jest.fn() } as never);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const spec = (adapter as any).config.buildSpec(
      ctx({ analyser: 'eslint', eslintCommand: 'node_modules/.bin/eslint' }),
    );
    expect(spec.command).toBe('node_modules/.bin/eslint');
    expect(enforceSandboxPolicy(spec, DEFAULT_SANDBOX_POLICY).allowed).toBe(true);
  });

  it('THE PACK IS REACHABLE AT ALL: the sandbox no longer denies every analyser it names', () => {
    // Measured before this gap: `evolith validate --select .../iso-5055.rules.json`
    // reported `passed, rulesChecked: 0, rulesSkipped: 4` — the four rules named
    // `semgrep`, the allowlist held none of the binaries the adapter can spawn,
    // and the pack GT-662 and GT-663 built had never once run from the CLI.
    for (const command of ['semgrep', 'eslint', 'cat']) {
      expect(enforceSandboxPolicy({ command, args: [] }, DEFAULT_SANDBOX_POLICY).allowed).toBe(true);
    }
  });

  it('REFUSES to run ESLint at all when the table did not load', () => {
    // Without the table every ESLint finding is untagged, every measure comes
    // back empty, and the run reports a clean repository having asked nothing.
    // The gap is checked BEFORE the process, so the rule SKIPs.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const gap = (createIso5055Adapter({ run: jest.fn() } as never) as any).config.certificationGap;
    expect(gap(ctx({ analyser: 'eslint' }))).toBeUndefined(); // the shipped table DOES load
    expect(buildEslintCweMap(undefined).size).toBe(0); // and this is what would trip it
  });

  // --- the mapping and its provenance ---------------------------------------

  it('an ESLint finding reaches a measure it could not reach before', () => {
    // `no-fallthrough` → CWE-484 (Omitted Break Statement in Switch) → Reliability,
    // a measure both CWE-tagging analysers left at 0/74 on this repository.
    const violations = iso5055ViolationsFromSarif(eslintLog('no-fallthrough'), index, { cweMap });
    const measures = violations.map((v) => v.ruleId);
    expect(measures).toContain(MEASURE_RULE_IDS.Reliability);
    expect(violations[0].message).toContain('CWE-484');
  });

  it('SAYS WHOSE CLAIM IT IS: a mapped finding is never dressed as the analyser\'s', () => {
    const [violation] = iso5055ViolationsFromSarif(eslintLog('no-fallthrough'), index, { cweMap });
    expect(violation.message).toContain('ESLint declares no CWE');
    expect(violation.message).toContain('NOT by the analyser');
    expect(violation.message).toMatch(/human claim/i);
  });

  it('and an analyser-tagged finding carries NO such disclaimer', () => {
    // The distinction has to cut both ways or it is decoration. CodeQL tagged
    // this itself, and nothing in the message may imply Evolith inferred it.
    const [violation] = iso5055ViolationsFromSarif(codeqlLog, index, { cweMap });
    expect(violation.message).not.toContain('hand-written');
    expect(violation.message).not.toContain('NOT by the analyser');
  });

  it('a `broad` row says it is broad, and a threshold rule says the threshold is the tenant\'s', () => {
    const broad = iso5055ViolationsFromSarif(eslintLog('eqeqeq'), index, { cweMap })[0];
    expect(broad.message).toContain('confidence: broad');
    const threshold = iso5055ViolationsFromSarif(eslintLog('complexity'), index, { cweMap })[0];
    expect(threshold.message).toContain('threshold the tenant configured');
  });

  it('the table is NOT consulted for another tool that happens to share a rule id', () => {
    // Every row argues from an ESLint CORE rule's documented behaviour. A
    // semgrep rule called `eqeqeq` is not that rule and was never examined.
    const log = JSON.stringify({
      runs: [{ tool: { driver: { name: 'semgrep' } }, results: [{ ruleId: 'eqeqeq' }] }],
    });
    const out = iso5055ViolationsFromSarif(log, index, { cweMap });
    expect(out.filter((v) => v.severity !== 'warning')).toEqual([]);
  });

  it('locates the finding in the repository, not on the machine that ran the lint', () => {
    // ESLint's SARIF writes an absolute `file://` URI; a violation naming
    // /Users/someone/checkout/... is unusable in a report a second person reads.
    const [violation] = iso5055ViolationsFromSarif(eslintLog('no-fallthrough'), index, {
      cweMap,
      basePath: '/repo',
    });
    expect(violation.file).toBe('src/switch.ts');
    expect(relativizeSarifUri('src/db.ts', '/repo')).toBe('src/db.ts'); // CodeQL's shape is untouched
  });

  // --- what a clean ESLint run is allowed to imply ---------------------------

  it('A CLEAN ESLint RUN PUBLISHES ITS CEILING, which is knowable here', () => {
    // The general GT-663 advisory can only say "we do not know what the analyser
    // looks for". For ESLint we DO know: the table reaches 11 of the 138 and
    // nothing else can ever be attributed, whatever the tenant enabled.
    const [advisory] = iso5055ViolationsFromSarif(
      JSON.stringify({ runs: [{ tool: { driver: { name: 'ESLint' } }, results: [] }] }),
      index,
      { cweMap },
    );
    expect(advisory.severity).toBe('warning');
    expect(advisory.message).toContain('0 of the 138');
    expect(advisory.message).toContain(`at most ${cweMap.reach.length} of the 138`);
  });

  it('the coverage advisory carries the provenance split, not just the totals', () => {
    const coverage = iso5055CoverageFromSarif(eslintLog('eqeqeq'), index, { cweMap });
    expect(coverage.mapAttributedFindings).toBe(1);
    expect(coverage.analyserAttributedFindings).toBe(0);
    expect(coverage.broadlyMappedFindings).toBe(1);
    expect(describeIso5055Coverage(coverage)).toContain("hand-written ESLint→CWE table");
  });

  it('a CodeQL run reads EXACTLY as it did before the table existed', () => {
    // Non-forking: nothing about the analyser-tagged path may change, including
    // the sentence a reader has already learned to look for.
    const coverage = iso5055CoverageFromSarif(codeqlLog, index, { cweMap });
    expect(coverage.mapAttributedFindings).toBe(0);
    expect(coverage.analyserAttributedFindings).toBe(1);
    expect(describeIso5055Coverage(coverage)).not.toContain('hand-written');
  });
});
