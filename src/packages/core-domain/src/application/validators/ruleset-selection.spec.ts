import { selectRules, ruleMatchesRef, refsOf } from './ruleset-selection';
import { NormalizedRule } from '../../domain/models/normalized-rule';

/**
 * GT-659 — fixtures for a selection that is finally obeyed.
 *
 * The direction that matters most is the one that must NOT happen: a selection
 * naming something this Core does not have must be visible, never an empty pass.
 * A filter whose failure mode is "zero rules, zero violations" hands out clean
 * bills of health for questions nobody answered.
 */

const rule = (id: string, sourceFile: string): NormalizedRule =>
  ({ id, sourceFile, severity: 'MUST', category: 'c', title: id, description: '', blocking: false }) as NormalizedRule;

const CORPUS: NormalizedRule[] = [
  rule('ACL-01', 'acl/anti-corruption-layer.rules.json'),
  rule('ACL-02', 'acl/anti-corruption-layer.rules.json'),
  rule('SSDF-PW.4.1', 'standards/ssdf-v1.1.rules.json'),
  rule('SSDF-PS.3.2', 'standards/ssdf-v1.1.rules.json'),
  rule('DEP-01', 'cross-cutting/dependency-management.rules.json'),
];

describe('refsOf', () => {
  it('merges both fields, trims and deduplicates', () => {
    expect(refsOf({ rulesetRef: ' a ', policyRefs: ['b', 'a', '  '] })).toEqual(['a', 'b']);
  });

  it('an absent selection yields no refs', () => {
    expect(refsOf(undefined)).toEqual([]);
    expect(refsOf({})).toEqual([]);
  });
});

describe('ruleMatchesRef', () => {
  const r = CORPUS[2];

  it('matches the corpus-relative path', () => {
    expect(ruleMatchesRef(r, 'standards/ssdf-v1.1.rules.json')).toBe(true);
  });

  it('matches the catalogue $id, which is a URL — a correct request must not fail on punctuation', () => {
    expect(ruleMatchesRef(r, 'https://evolith.dev/rulesets/standards/ssdf-v1.1.rules.json')).toBe(true);
  });

  it('THE ABUSE CASE: a prefix that is not a path segment does NOT match', () => {
    // `acl` must not select `acl-extras`, or a caller asking for one pack
    // silently gets another.
    expect(ruleMatchesRef(rule('X', 'acl-extras/other.rules.json'), 'acl')).toBe(false);
  });

  it('does not match an unrelated ruleset', () => {
    expect(ruleMatchesRef(r, 'acl/anti-corruption-layer.rules.json')).toBe(false);
  });
});

describe('selectRules', () => {
  it('NO selection evaluates everything — today\'s behaviour, unchanged', () => {
    const out = selectRules(CORPUS, undefined);
    expect(out.selected).toHaveLength(5);
    expect(out.unrestricted).toBe(true);
    expect(out.corpusTotal).toBe(5);
  });

  it('a selection evaluates only what was asked for, and still reports the corpus size', () => {
    const out = selectRules(CORPUS, { rulesetRef: 'standards/ssdf-v1.1.rules.json' });
    expect(out.selected.map((r) => r.id)).toEqual(['SSDF-PW.4.1', 'SSDF-PS.3.2']);
    // Both numbers, so 2 of 5 can never be read as a corpus of 2.
    expect(out.corpusTotal).toBe(5);
    expect(out.unrestricted).toBe(false);
  });

  it('policyRefs add to the selection and the union is deduplicated', () => {
    const out = selectRules(CORPUS, {
      rulesetRef: 'standards/ssdf-v1.1.rules.json',
      policyRefs: ['acl/anti-corruption-layer.rules.json', 'standards/ssdf-v1.1.rules.json'],
    });
    expect(out.selected).toHaveLength(4);
    expect(out.matched).toHaveLength(2);
  });

  it('THE CASE THAT MUST NOT PASS QUIETLY: a ref matching nothing is reported, not silently empty', () => {
    const out = selectRules(CORPUS, { rulesetRef: 'standards/iso-27001.rules.json' });
    expect(out.selected).toHaveLength(0);
    expect(out.unmatched).toEqual(['standards/iso-27001.rules.json']);
    expect(out.matched).toEqual([]);
    // The caller can now refuse. What it must never do is report zero violations.
  });

  it('a partly-unknown selection keeps what matched AND names what did not', () => {
    const out = selectRules(CORPUS, {
      rulesetRef: 'standards/ssdf-v1.1.rules.json',
      policyRefs: ['standards/nothing-here.rules.json'],
    });
    expect(out.selected).toHaveLength(2);
    expect(out.matched).toEqual(['standards/ssdf-v1.1.rules.json']);
    expect(out.unmatched).toEqual(['standards/nothing-here.rules.json']);
  });

  it('preserves corpus order, so two runs of one selection diff cleanly', () => {
    const out = selectRules(CORPUS, { policyRefs: ['cross-cutting/dependency-management.rules.json', 'acl/anti-corruption-layer.rules.json'] });
    expect(out.selected.map((r) => r.id)).toEqual(['ACL-01', 'ACL-02', 'DEP-01']);
  });

  it('an empty corpus with a selection is unmatched, not a pass', () => {
    const out = selectRules([], { rulesetRef: 'anything' });
    expect(out.selected).toHaveLength(0);
    expect(out.unmatched).toEqual(['anything']);
  });
});
