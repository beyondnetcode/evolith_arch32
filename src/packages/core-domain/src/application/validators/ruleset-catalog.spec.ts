import { buildRulesetCatalog } from './ruleset-catalog';
import { selectRules } from './ruleset-selection';
import type { NormalizedRule } from '../../domain/models/normalized-rule';

/**
 * GT-660 — the catalogue is only worth anything if every ref it publishes
 * actually selects something.
 *
 * `--select` shipped in GT-659 telling callers to use «the id the catalogue
 * publishes», and no catalogue existed. The failure mode this file is built
 * around is the one that would replace it: a catalogue that publishes refs the
 * selector then rejects with a blocking `SEL-01`. That is worse than no
 * catalogue, because it turns a documentation gap into a broken instruction.
 *
 * So the central test does not check the shape of the output — it feeds every
 * published ref back through `selectRules` and demands the pack come out.
 */

const rule = (
  id: string,
  sourceFile: string,
  extra: Partial<NormalizedRule> = {},
): NormalizedRule =>
  ({
    id,
    sourceFile,
    severity: 'MUST',
    category: 'structure',
    title: id,
    description: '',
    blocking: true,
    ...extra,
  }) as NormalizedRule;

const CORPUS: NormalizedRule[] = [
  rule('SSDF-PW.4.1', 'standards/ssdf-v1.1.rules.json', { severity: 'MUST', blocking: false, category: 'supply-chain' }),
  rule('SSDF-PO.3.1', 'standards/ssdf-v1.1.rules.json', { severity: 'SHOULD', blocking: false, category: 'supply-chain' }),
  rule('ACL-01', 'acl/anti-corruption-layer.rules.json'),
  rule('ACL-02', 'acl/anti-corruption-layer.rules.json', { severity: 'SHOULD', blocking: false, category: 'boundaries' }),
  rule('OC-01', 'open-core/boundary.rules.json'),
];

describe('buildRulesetCatalog · GT-660', () => {
  it('THE PROPERTY THAT MATTERS: every published ref selects its own pack', () => {
    const catalog = buildRulesetCatalog(CORPUS);
    expect(catalog.entries.length).toBeGreaterThan(0);

    for (const entry of catalog.entries) {
      const outcome = selectRules(CORPUS, { policyRefs: [entry.ref] });
      expect(outcome.unmatched).toEqual([]);
      expect(outcome.selected).toHaveLength(entry.rules);
      // A ref that selected the WRONG pack would satisfy the count above by
      // accident, so the identity is checked too.
      expect(outcome.selected.every((r) => r.sourceFile === entry.ref)).toBe(true);
    }
  });

  it('groups by pack and counts what a tenant is signing up for', () => {
    const catalog = buildRulesetCatalog(CORPUS);
    expect(catalog.packs).toBe(3);
    expect(catalog.rules).toBe(5);

    const ssdf = catalog.entries.find((e) => e.ref.includes('ssdf'))!;
    expect(ssdf.rules).toBe(2);
    // The number a tenant actually needs before adopting: how many of these can
    // turn their build red. Both SSDF rules report and neither blocks.
    expect(ssdf.blocking).toBe(0);
    expect(ssdf.severities).toEqual(['MUST', 'SHOULD']);
    expect(ssdf.categories).toEqual(['supply-chain']);
  });

  it('the blocking total is the honest one — it is the reason to publish it at all', () => {
    const catalog = buildRulesetCatalog(CORPUS);
    // ACL-01 and OC-01 block; both SSDF rules and ACL-02 do not.
    expect(catalog.blocking).toBe(2);
    expect(catalog.entries.find((e) => e.ref.includes('acl'))!.blocking).toBe(1);
  });

  it('the corpus total agrees with the selector, so the menu cannot overstate the engine', () => {
    const catalog = buildRulesetCatalog(CORPUS);
    const everything = selectRules(CORPUS, undefined);
    expect(catalog.rules).toBe(everything.corpusTotal);
  });

  it('a rule with no source file is not advertised, because nothing could select it', () => {
    const catalog = buildRulesetCatalog([...CORPUS, rule('ORPHAN-01', '')]);
    expect(catalog.rules).toBe(5);
    expect(catalog.entries.some((e) => e.ref === '')).toBe(false);
  });

  it('an empty corpus yields an empty catalogue rather than throwing', () => {
    // The domain refuses to decide what "nothing to offer" means — a CLI renders
    // it as an empty menu, a guard treats it as a hard failure. Both need the
    // call to return.
    const catalog = buildRulesetCatalog([]);
    expect(catalog).toEqual({ entries: [], packs: 0, rules: 0, blocking: 0 });
  });

  it('entries are sorted by ref, so two runs diff cleanly', () => {
    const catalog = buildRulesetCatalog([...CORPUS].reverse());
    expect(catalog.entries.map((e) => e.ref)).toEqual([...catalog.entries.map((e) => e.ref)].sort());
  });
});
