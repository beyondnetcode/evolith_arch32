import { selectRules } from './ruleset-selection';
import { NormalizedRule } from '../../domain/models/normalized-rule';

/**
 * GT-659 — the threading, asserted at the seam that decides the verdict.
 *
 * `ruleset-selection.spec.ts` covers the pure selector. This covers the contract
 * the callers depend on: what the ENGINE returns for a selection, and therefore
 * what the validator must turn into a blocking issue. The case that matters is
 * the one that must never be silent — a caller naming a ruleset this Core does
 * not have, receiving zero rules evaluated and zero violations, which is
 * indistinguishable from a passing satellite.
 */

const rule = (id: string, sourceFile: string): NormalizedRule =>
  ({ id, sourceFile, severity: 'MUST', category: 'c', title: id, description: '', blocking: true }) as NormalizedRule;

const CORPUS = [
  rule('SSDF-PW.4.1', 'standards/ssdf-v1.1.rules.json'),
  rule('SSDF-PS.3.2', 'standards/ssdf-v1.1.rules.json'),
  rule('ACL-01', 'acl/anti-corruption-layer.rules.json'),
];

describe('GT-659 · what a caller receives for its selection', () => {
  it('a tenant asking for one pack is evaluated against that pack ALONE', () => {
    const out = selectRules(CORPUS, { policyRefs: ['standards/ssdf-v1.1.rules.json'] });
    expect(out.selected.map((r) => r.id)).toEqual(['SSDF-PW.4.1', 'SSDF-PS.3.2']);
    // This is the whole point of the row: a tenant can adopt a standards pack
    // without also adopting this repository's opinions about architecture.
    expect(out.selected.some((r) => r.id.startsWith('ACL'))).toBe(false);
  });

  it('the corpus size survives the selection, so 2-of-3 cannot read as a corpus of 2', () => {
    const out = selectRules(CORPUS, { policyRefs: ['standards/ssdf-v1.1.rules.json'] });
    expect(out.corpusTotal).toBe(3);
    expect(out.selected).toHaveLength(2);
  });

  it('THE CASE THE VALIDATOR MUST BLOCK ON: an unknown ref evaluates nothing and says so', () => {
    const out = selectRules(CORPUS, { policyRefs: ['standards/iso-27001.rules.json'] });
    expect(out.selected).toHaveLength(0);
    expect(out.unmatched).toEqual(['standards/iso-27001.rules.json']);
    // Zero rules with zero violations looks exactly like a clean satellite. The
    // ONLY thing that distinguishes them is this field being non-empty, which is
    // why `RulesetValidatorService` turns it into a blocking SEL-01 issue rather
    // than reporting a pass.
    expect(out.unrestricted).toBe(false);
  });

  it('a partly-unknown selection still evaluates what it found AND names what it did not', () => {
    const out = selectRules(CORPUS, {
      policyRefs: ['standards/ssdf-v1.1.rules.json', 'standards/nope.rules.json'],
    });
    expect(out.selected).toHaveLength(2);
    expect(out.unmatched).toEqual(['standards/nope.rules.json']);
    // Both halves are reported: the caller gets the verdict it CAN have, and is
    // told which question went unanswered. Dropping either would be a lie.
    expect(out.matched).toEqual(['standards/ssdf-v1.1.rules.json']);
  });

  it('no selection is not an empty selection — the distinction the CLI flag preserves', () => {
    // `--select` absent must reach the engine as `undefined`, not `[]`. If a typo
    // in a flag produced an empty array and that were treated as a selection,
    // the run would evaluate zero rules and report a pass.
    const none = selectRules(CORPUS, undefined);
    expect(none.selected).toHaveLength(3);
    expect(none.unrestricted).toBe(true);

    const empty = selectRules(CORPUS, { policyRefs: [] });
    expect(empty.unrestricted).toBe(true);
    expect(empty.selected).toHaveLength(3);
  });
});
