import { describeIso5055Coverage, iso5055CoverageFromSarif } from './iso-5055-coverage';
import { buildIso5055Index } from './iso-5055-measure';
import { ISO_5055_WEAKNESS_INDEX } from './iso-5055-index.generated';

/**
 * GT-663 — a count without its denominator silently redefines what it counts.
 *
 * GT-662 made the measurement real (34 violations over 10 distinct weaknesses on
 * this repository) but the report could not say *of how many*. The standard
 * names 138, so "found none" read identically whether the analyser looks for all
 * 138 or for none of them — and the second is the common case, because coverage
 * here is the ANALYSER's, never the standard's.
 *
 * This is GT-569's fix one standard over, and the tests below are about the same
 * thing: what the number is allowed to claim.
 */
const index = buildIso5055Index(ISO_5055_WEAKNESS_INDEX);

const sarif = (results: unknown[], rules: unknown[] = []) =>
  JSON.stringify({ runs: [{ tool: { driver: { name: 'CodeQL', rules } }, results }] });

describe('ISO/IEC 5055 coverage · GT-663', () => {
  it('THE DENOMINATOR: the standard names 138, and the report says so', () => {
    const c = iso5055CoverageFromSarif(sarif([]), index);
    expect(c.standardWeaknesses).toBe(138);
    expect(c.observedWeaknesses).toBe(0);
  });

  it('counts DISTINCT weaknesses, not findings — ten hits on one CWE is still one weakness', () => {
    const results = Array.from({ length: 10 }, () => ({ ruleId: 'r', properties: { cwe: ['CWE-89'] } }));
    const c = iso5055CoverageFromSarif(sarif(results), index);
    expect(c.observedWeaknesses).toBe(1);
    expect(c.observedCwes).toEqual([89]);
    // Findings are counted too, separately: they are what a reader acts on.
    expect(c.byMeasure.find((m) => m.measure === 'Security')!.findings).toBe(10);
    expect(c.byMeasure.find((m) => m.measure === 'Security')!.observed).toBe(1);
  });

  it('per measure, the denominator is that measure\'s own size', () => {
    const c = iso5055CoverageFromSarif(sarif([{ ruleId: 'r', properties: { cwe: ['CWE-89'] } }]), index);
    const security = c.byMeasure.find((m) => m.measure === 'Security')!;
    // 74 is the standard's own Security count, read off the shipped index.
    expect(security.total).toBe(74);
    expect(security.observed).toBe(1);
    // Every measure appears, including the ones with nothing found — a measure
    // that vanishes from a report is a measure nobody notices was never checked.
    expect(c.byMeasure.map((m) => m.measure)).toEqual([
      'Security', 'Reliability', 'Performance Efficiency', 'Maintainability',
    ]);
  });

  it('separates "outside the standard" from "the analyser tagged nothing"', () => {
    // Both are zero-contribution to the measurement and mean different things.
    // An untagged finding is not evidence of compliance — it is evidence the
    // analyser said nothing that could be mapped.
    const c = iso5055CoverageFromSarif(
      sarif([
        { ruleId: 'csrf', properties: { cwe: ['CWE-352'] } }, // real CWE, not in 5055
        { ruleId: 'style' }, // no CWE at all
      ]),
      index,
    );
    expect(index.measuresFor(352)).toEqual([]);
    expect(c.outOfScopeFindings).toBe(1);
    expect(c.untaggedFindings).toBe(1);
    expect(c.observedWeaknesses).toBe(0);
  });

  it('reads CWEs off the RULE too, which is where CodeQL puts them', () => {
    const c = iso5055CoverageFromSarif(
      sarif([{ ruleId: 'js/sqli' }], [{ id: 'js/sqli', properties: { tags: ['external/cwe/cwe-089'] } }]),
      index,
    );
    expect(c.observedCwes).toEqual([89]);
  });

  it('AN UNLOADED INDEX THROWS — "0 of 138" from nothing is a compliance claim built on nothing', () => {
    expect(() => iso5055CoverageFromSarif(sarif([]), buildIso5055Index(undefined))).toThrow(/did not load/i);
  });

  // --- the sentence -------------------------------------------------------

  it('THE CAVEAT TRAVELS WITH THE NUMBER: the text names the floor as a floor', () => {
    const c = iso5055CoverageFromSarif(sarif([{ ruleId: 'r', properties: { cwe: ['CWE-89'] } }]), index);
    const text = describeIso5055Coverage(c);
    expect(text).toContain('1 of the 138');
    expect(text).toContain('FLOOR');
    // The claim it must never make: that the rest are absent.
    expect(text).toMatch(/says nothing about how many/);
    expect(text).not.toMatch(/compliant|passes the standard/i);
  });

  it('the sentence survives a run that found nothing, which is when it matters most', () => {
    const text = describeIso5055Coverage(iso5055CoverageFromSarif(sarif([]), index));
    expect(text).toContain('0 of the 138');
    expect(text).toContain('FLOOR');
  });
});
