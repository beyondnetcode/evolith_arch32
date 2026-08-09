import { ValidateCommand } from './validate.command';

/**
 * GT-661 — the CLI's half of «the Core proposes, the client configures».
 *
 * Until the profile could carry `select`, the only way to scope a run was a flag
 * somebody had to type on every invocation — which is not configuration, it is a
 * thing a person eventually forgets on the run that mattered.
 *
 * `resolveSelection` is private on purpose: it is an implementation detail of
 * one command, not a contract. It is exercised through the instance because the
 * distinction it protects is not decorative — an empty selection that reached
 * the engine would evaluate zero rules, find zero violations, and report a pass
 * over a repository nobody examined.
 */
describe('ValidateCommand.resolveSelection · GT-661', () => {
  const withProfile = (select?: string[]) => {
    const cmd = Object.create(ValidateCommand.prototype) as ValidateCommand;
    Object.defineProperty(cmd, 'profile', { get: () => ({ select }), configurable: true });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (flag?: string[]) => (cmd as any).resolveSelection(flag) as string[] | undefined;
  };

  it('the flag wins over the profile — an explicit argument is a deliberate act', () => {
    const resolve = withProfile(['standards/ssdf-v1.1.rules.json']);
    expect(resolve(['acl/anti-corruption-layer.rules.json'])).toEqual(['acl/anti-corruption-layer.rules.json']);
  });

  it('the flag can WIDEN a stored default, not only narrow it', () => {
    const resolve = withProfile(['standards/ssdf-v1.1.rules.json']);
    expect(resolve(['a/one.rules.json', 'b/two.rules.json'])).toEqual(['a/one.rules.json', 'b/two.rules.json']);
  });

  it('with no flag, the tenant profile is what scopes the run', () => {
    const resolve = withProfile(['standards/ssdf-v1.1.rules.json']);
    expect(resolve()).toEqual(['standards/ssdf-v1.1.rules.json']);
    expect(resolve([])).toEqual(['standards/ssdf-v1.1.rules.json']);
  });

  it('THE DISTINCTION: nothing configured anywhere is `undefined`, never an empty selection', () => {
    // `undefined` reaches the engine as "the caller named nothing" -> the whole
    // corpus, reported as `selection.source: core-default`. `[]` would be a
    // selection OF nothing: zero rules evaluated, zero violations, a pass.
    for (const profileSelect of [undefined, [], ['   '], ['', '  ']]) {
      const resolve = withProfile(profileSelect);
      expect(resolve()).toBeUndefined();
      expect(resolve([])).toBeUndefined();
      expect(resolve(['  '])).toBeUndefined();
    }
  });

  it('blanks are dropped from both sources rather than forwarded as refs', () => {
    expect(withProfile([' standards/ssdf-v1.1.rules.json ', '  '])()).toEqual(['standards/ssdf-v1.1.rules.json']);
    expect(withProfile()(['  ', ' acl/x.rules.json'])).toEqual(['acl/x.rules.json']);
  });
});
