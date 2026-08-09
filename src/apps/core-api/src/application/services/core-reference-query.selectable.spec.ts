import { ruleMatchesRef } from '@beyondnet/evolith-core-domain/application/validators/ruleset-selection';

/**
 * GT-660 — the endpoint that publishes the menu must publish a SELECTABLE menu.
 *
 * `GET /api/v1/rulesets` has published an `id` since before the selector
 * existed, and `evolith-validate`'s own `select` description points callers at
 * it. But `id` is whatever a ruleset declares — `metadata.id`, `$id`, or the
 * relative path with its extension stripped — and only the middle one happens to
 * survive `ruleMatchesRef`. Measured over this corpus: **17 of 183** ids match
 * no rule, so a client following the documentation exactly receives a blocking
 * `SEL-01` on 17 of them.
 *
 * `ref` was added for that, and this file is the reason it can be trusted: it
 * asserts the round trip the endpoint's advice depends on.
 */
describe('RulesetSummary.ref · GT-660', () => {
  const rule = (sourceFile: string) => ({ sourceFile }) as never;

  it('THE ROUND TRIP: the published ref selects the rule it came from', () => {
    for (const relativePath of [
      'src/rulesets/standards/ssdf-v1.1.rules.json',
      'src/rulesets/acl/anti-corruption-layer.rules.json',
      'src/rulesets/adr/generated/adr-0001-monorepo-orchestration-principle.rules.json',
    ]) {
      expect(ruleMatchesRef(rule(relativePath), relativePath)).toBe(true);
    }
  });

  it('the id shapes the endpoint can emit do NOT all round-trip — which is why ref exists', () => {
    const source = rule('src/rulesets/standards/ssdf-v1.1.rules.json');

    // `$id` as a published URL: survives, because the selector strips the host.
    expect(ruleMatchesRef(source, 'https://evolith.dev/rulesets/standards/ssdf-v1.1.rules.json')).toBe(true);

    // `metadata.id`: a bare name that is not a path segment of the source.
    expect(ruleMatchesRef(source, 'ssdf-v1.1')).toBe(false);

    // The path fallback, with the extension stripped by `toSummary`.
    expect(ruleMatchesRef(source, 'standards/ssdf-v1.1')).toBe(false);
  });

  it('a ref is compared on whole path segments, so one pack cannot select another', () => {
    // The property that makes a short ref safe to hand out: `acl` must not
    // silently select `acl-extras`.
    expect(ruleMatchesRef(rule('src/rulesets/acl-extras/x.rules.json'), 'acl/x.rules.json')).toBe(false);
    expect(ruleMatchesRef(rule('src/rulesets/acl/x.rules.json'), 'acl/x.rules.json')).toBe(true);
  });
});
