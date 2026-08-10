import { ESLINT_CWE_MAP } from './eslint-cwe-map.generated';
import {
  attributeCwes,
  buildEslintCweMap,
  describeMapProvenance,
  isEslintDriver,
  withAttributedCwes,
} from './eslint-cwe-map';
import { buildIso5055Index, cwesOfSarifResult } from './iso-5055-measure';
import JSON_MAP from '../../../../../../rulesets/standards/eslint-cwe-map.json';
import WEAKNESSES from '../../../../../../rulesets/standards/iso-5055-weaknesses.json';

/**
 * GT-664 — the ESLint→CWE table, and the line it must never let anyone cross.
 *
 * The table is the only reason ESLint findings can be read against ISO/IEC 5055
 * at all: ESLint declares no CWE for any rule, in any version. That makes every
 * row a human claim rather than a tool's own taxonomy, which is a weaker kind of
 * evidence — so what these tests protect is not the mapping's accuracy (a person
 * reviews the rationales for that) but the two things code can guarantee: that
 * the compiled copy still equals the JSON, and that a mapped finding can always
 * be told apart from one the analyser tagged itself.
 */

const map = buildEslintCweMap(ESLINT_CWE_MAP);
const index = buildIso5055Index(WEAKNESSES);

describe('ESLint→CWE map · GT-664', () => {
  // --- the copy ------------------------------------------------------------

  it('THE COPY IS FAITHFUL: the generated constant equals the JSON source', () => {
    // Same reason as the ISO index: the adapter must not require a corpus JSON
    // by relative path, because `src/rulesets` becomes `/app/corpus/rulesets` in
    // the image and core-api dies at boot. The JSON stays what a human edits and
    // this is what stops the compiled copy drifting from it.
    const source = JSON_MAP as { entries: Array<Record<string, unknown>>; thresholdDependent: { ruleIds: string[] } };
    expect(ESLINT_CWE_MAP.entries.map((e) => ({ ...e }))).toEqual(
      source.entries.map((e) => ({
        ruleId: e.ruleId,
        cwe: e.cwe,
        cweName: e.cweName,
        confidence: e.confidence,
      })),
    );
    expect([...ESLINT_CWE_MAP.thresholdDependent]).toEqual(source.thresholdDependent.ruleIds);
  });

  it('carries NO runtime dependency on the corpus tree — the whole point', () => {
    const src = require('node:fs').readFileSync(
      require('node:path').join(__dirname, '../enforcement/adapters/iso-5055-adapter.ts'),
      'utf8',
    );
    expect(src).not.toMatch(/rulesets\/standards\/eslint-cwe-map\.json'/);
  });

  // --- the rows ------------------------------------------------------------

  it('every mapped CWE is one ISO/IEC 5055 actually names', () => {
    // A row pointing outside the standard is not conservative, it is DEAD: it
    // could never raise the measurement and nothing would ever say so.
    for (const entry of ESLINT_CWE_MAP.entries) {
      expect(index.measuresFor(entry.cwe).length).toBeGreaterThan(0);
    }
  });

  it('reaches 11 of the 138 weaknesses, and NONE of Performance Efficiency', () => {
    // Written as an assertion because it is the honest headline of this gap.
    // Performance Efficiency was the measure ESLint was supposed to unlock; the
    // two candidate rules were rejected on reading the CWEs (CWE-1050 is about a
    // loop consuming platform resources, not about forfeited parallelism), and a
    // number that moved would mean someone re-added a row without the argument.
    expect(map.reach).toHaveLength(11);
    const reachable = new Set(map.reach.flatMap((cwe) => index.measuresFor(cwe)));
    expect(reachable.has('Performance Efficiency')).toBe(false);
    expect(reachable.has('Reliability')).toBe(true);
    expect(reachable.has('Maintainability')).toBe(true);
  });

  it('claims one CWE per rule id — a second claim would make the lookup order-dependent', () => {
    const ids = ESLINT_CWE_MAP.entries.map((e) => e.ruleId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('a table that did not load reports size 0 rather than throwing or inventing', () => {
    // The caller decides what empty means. The adapter treats it as a refusal to
    // certify; nothing may treat it as "no weaknesses found".
    const empty = buildEslintCweMap(undefined);
    expect(empty.size).toBe(0);
    expect(empty.reach).toEqual([]);
    expect(empty.entriesFor('eqeqeq')).toEqual([]);
  });

  // --- provenance, which is the point ---------------------------------------

  it('THE ANALYSER WINS: a tool that tagged its own finding is never overwritten by the table', () => {
    // CodeQL saying `external/cwe/cwe-089` is a stronger claim than anything
    // this table can make. Padding it with our inference would blur exactly the
    // distinction the gap exists to preserve.
    const attributed = attributeCwes('eqeqeq', [89], map);
    expect(attributed.provenance).toBe('analyser');
    expect(attributed.all).toEqual([89]);
    expect(attributed.mapped).toEqual([]);
  });

  it('an untagged ESLint rule is attributed BY THE TABLE, and says so', () => {
    const attributed = attributeCwes('eqeqeq', [], map);
    expect(attributed.provenance).toBe('evolith-eslint-map');
    expect(attributed.all).toEqual([597]);
    expect(attributed.mapped[0].confidence).toBe('broad');
  });

  it('a rule the table does not name gets NOTHING — no CWE, no provenance', () => {
    // The third state. "We could not attribute this" is not "the analyser
    // tagged it" and not "we mapped it", and collapsing it into either would
    // misreport what the run actually knows.
    const attributed = attributeCwes('no-console', [], map);
    expect(attributed.provenance).toBeUndefined();
    expect(attributed.all).toEqual([]);
  });

  it('the table is applied ONLY to a run ESLint produced', () => {
    // Every row is an argument about an ESLint CORE rule id. Resolving another
    // tool's rule id through it would attribute a CWE on the strength of an
    // argument nobody made about that tool.
    expect(isEslintDriver('ESLint')).toBe(true);
    expect(isEslintDriver('eslint')).toBe(true);
    expect(isEslintDriver('CodeQL')).toBe(false);
    expect(isEslintDriver('semgrep')).toBe(false);
    expect(isEslintDriver(undefined)).toBe(false);
  });

  it('reuses the GT-662 translation rather than reimplementing it for a second producer', () => {
    // `withAttributedCwes` puts the mapped CWEs where `cwesOfSarifResult`
    // already looks, so classification stays one code path with one set of
    // tests. Two implementations of "which measure is this" is how the two
    // producers would quietly disagree.
    const result = { ruleId: 'no-fallthrough', properties: { precision: 'high' } };
    const enriched = withAttributedCwes(result, [484]);
    expect(cwesOfSarifResult(enriched)).toEqual([484]);
    expect((enriched as { properties: { precision: string } }).properties.precision).toBe('high');
  });

  it('names the threshold-dependent rules, because their counts are not portable', () => {
    // `complexity`, `max-params` and `max-lines` count against a maximum the
    // TENANT chose. The same repository yields a different number at a different
    // option, so the report has to carry the caveat with the figure.
    expect(map.isThresholdDependent('complexity')).toBe(true);
    expect(map.isThresholdDependent('max-lines')).toBe(true);
    expect(map.isThresholdDependent('no-fallthrough')).toBe(false);
  });

  it('the provenance sentence says whose claim it is, in words, every time', () => {
    const sentence = describeMapProvenance(23, 23, 0);
    expect(sentence).toContain('NOT by the analyser');
    expect(sentence).toContain('ESLint declares no CWE');
    expect(sentence).toMatch(/human claim/i);
  });
});
