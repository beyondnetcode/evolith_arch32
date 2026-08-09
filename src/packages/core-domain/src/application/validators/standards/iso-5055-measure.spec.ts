import {
  buildIso5055Index,
  classifySarifResult,
  cwesOfSarifResult,
  parseCweToken,
} from './iso-5055-measure';
import WEAKNESSES from '../../../../../../rulesets/standards/iso-5055-weaknesses.json';

/**
 * GT-662 — the translation layer that turns a free analyser's output into an
 * ISO/IEC 5055 measurement.
 *
 * The failure this file is built around is a silent zero. Every spelling below
 * is one a real producer emits, and a parser that handled only one of them would
 * score a repository at zero against the other two — which reads exactly like a
 * clean repository. That is the same class of defect as a gate reporting green
 * over an unevaluated repo, and it is why the shipped index is loaded here
 * rather than a fixture: a test that builds its own index proves the code works
 * against the index it invented.
 */
describe('ISO/IEC 5055 measure mapping · GT-662', () => {
  const index = buildIso5055Index(WEAKNESSES);

  it('loads the SHIPPED index, and the standard says how many there should be', () => {
    // 138 is the standard's own count, recorded in the index's `standard` block.
    expect(index.size).toBe(138);
    expect((WEAKNESSES as { standard?: { weaknessCount?: number } }).standard?.weaknessCount).toBe(138);
  });

  it('a weakness can belong to more than one measure, and both are kept', () => {
    // The measure counts sum to 197 over 138 distinct CWEs, so overlap is not
    // hypothetical: collapsing it would under-report every shared weakness.
    const multi = index.weaknesses().filter((w) => w.measures.length > 1);
    expect(multi.length).toBeGreaterThan(0);
    const totalMemberships = index.weaknesses().reduce((sum, w) => sum + w.measures.length, 0);
    expect(totalMemberships).toBe(197);
  });

  it('a CWE outside the standard maps to NO measure — silence, not a guess', () => {
    expect(index.measuresFor(999_999)).toEqual([]);
  });

  // --- the spellings ---------------------------------------------------------

  it('THE SILENT ZERO: every spelling a real producer emits parses to the same number', () => {
    for (const token of ['CWE-79', 'cwe-79', 'CWE_79', 'cwe 79', 'external/cwe/cwe-079', '079', 79, 'CWE-79: XSS']) {
      expect(parseCweToken(token)).toBe(79);
    }
  });

  it('rejects tokens that are not CWEs rather than inventing a number', () => {
    // Five digits is out of range on purpose: CWE ids are at most four, and a
    // parser that accepted more would happily turn a line number into a CWE.
    for (const token of [undefined, null, '', 'nope', 'CWE-', 'rule/no-eval', {}, -1, 0, 'cwe-99999']) {
      expect(parseCweToken(token)).toBeUndefined();
    }
  });

  // --- the two producers -----------------------------------------------------

  it("CodeQL puts CWEs on the RULE, not the result — a reader of results alone finds nothing", () => {
    const result = { ruleId: 'js/xss' };
    const ruleMeta = { id: 'js/xss', properties: { tags: ['security', 'external/cwe/cwe-079', 'external/cwe/cwe-116'] } };

    expect(cwesOfSarifResult(result)).toEqual([]);          // the defect, made explicit
    expect(cwesOfSarifResult(result, ruleMeta)).toEqual([79, 116]);
  });

  it('semgrep puts them on the result itself', () => {
    const result = { ruleId: 'javascript.lang.security.audit.xss', properties: { cwe: ['CWE-79: Improper Neutralization'] } };
    expect(cwesOfSarifResult(result)).toEqual([79]);
  });

  it('both sources are read and duplicates collapse', () => {
    const result = { ruleId: 'r', properties: { cwe: ['CWE-79'] } };
    const ruleMeta = { id: 'r', properties: { tags: ['external/cwe/cwe-079', 'external/cwe/cwe-089'] } };
    expect(cwesOfSarifResult(result, ruleMeta)).toEqual([79, 89]);
  });

  // --- classification --------------------------------------------------------

  it('classifies a CodeQL finding into the measures ISO 5055 assigns it', () => {
    const finding = classifySarifResult(
      index,
      { ruleId: 'js/sql-injection' },
      { id: 'js/sql-injection', properties: { tags: ['external/cwe/cwe-089'] } },
    );
    expect(finding.ruleId).toBe('js/sql-injection');
    expect(finding.iso5055Cwes).toEqual([89]);
    expect(finding.measures).toContain('Security');
  });

  it('THE REPORT THAT MUST NOT COLLAPSE: out-of-scope findings are kept, not dropped', () => {
    // "this scan found nothing ISO 5055 cares about" and "this scan found
    // nothing" are different reports, and only one of them is about the code.
    const finding = classifySarifResult(
      index,
      { ruleId: 'js/csrf' },
      { id: 'js/csrf', properties: { tags: ['security', 'external/cwe/cwe-352'] } },
    );
    // CWE-352 (CSRF) is a real weakness a scanner reports and one ISO/IEC 5055
    // does NOT name — checked against the shipped index below rather than
    // asserted, so this stays true if the standard's membership ever changes.
    expect(index.measuresFor(352)).toEqual([]);
    expect(finding.cwes).toEqual([352]);
    expect(finding.iso5055Cwes).toEqual([]);
    expect(finding.measures).toEqual([]);
  });

  it('a finding with no CWE at all is reported as such, not as compliant', () => {
    const finding = classifySarifResult(index, { ruleId: 'style/semicolon' }, { id: 'style/semicolon' });
    expect(finding.cwes).toEqual([]);
    expect(finding.measures).toEqual([]);
  });

  // --- vacuity ---------------------------------------------------------------

  it('an index that did not load has size 0 — it never silently reports compliance', () => {
    for (const bad of [undefined, null, {}, { measures: null }, { measures: { Security: 'nope' } }]) {
      const empty = buildIso5055Index(bad);
      expect(empty.size).toBe(0);
      expect(empty.measuresFor(79)).toEqual([]);
      // Published so a caller can refuse to report against nothing, which is the
      // only thing standing between an unloaded index and a clean bill of health.
      expect(empty.weaknesses()).toEqual([]);
    }
  });
});
