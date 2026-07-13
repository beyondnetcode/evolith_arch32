import {
  parseCodeowners,
  resolveCodeowner,
  codeownersPatternToRegExp,
  enrichViolationsWithCodeowners,
} from './codeowners';
import { makeViolation } from './violation';

describe('parseCodeowners (GT-518 · EAG-13 — CODEOWNERS enrichment)', () => {
  it('parses pattern + owners, skips comments/blank/owner-less lines, preserves order', () => {
    const rules = parseCodeowners(
      [
        '# comment',
        '',
        '*            @org/default',
        '/src/packages/core-domain/  @org/core-team @arch-lead',
        '/legacy/', // owner-less → unset → dropped
        'docs/adr/*.md   @org/governance',
      ].join('\n'),
    );
    expect(rules.map((r) => r.pattern)).toEqual([
      '*',
      '/src/packages/core-domain/',
      'docs/adr/*.md',
    ]);
    expect(rules[1].owners).toEqual(['@org/core-team', '@arch-lead']);
    expect(rules.map((r) => r.order)).toEqual([0, 1, 2]);
  });
});

describe('codeownersPatternToRegExp', () => {
  it('bare catch-all `*` matches any depth', () => {
    const re = codeownersPatternToRegExp('*');
    expect(re.test('a.ts')).toBe(true);
    expect(re.test('src/deep/b.ts')).toBe(true);
  });

  it('anchored dir pattern matches the subtree only', () => {
    const re = codeownersPatternToRegExp('/src/packages/core-domain/');
    expect(re.test('src/packages/core-domain/x/y.ts')).toBe(true);
    expect(re.test('src/packages/core-domain')).toBe(true);
    expect(re.test('src/packages/other/z.ts')).toBe(false);
  });

  it('unanchored extension pattern matches at any depth', () => {
    const re = codeownersPatternToRegExp('*.md');
    expect(re.test('README.md')).toBe(true);
    expect(re.test('docs/adr/ADR-0002.md')).toBe(true);
    expect(re.test('docs/adr/ADR-0002.ts')).toBe(false);
  });

  it('`**` crosses directories', () => {
    const re = codeownersPatternToRegExp('docs/**/adr');
    expect(re.test('docs/a/b/adr')).toBe(true);
    expect(re.test('docs/adr')).toBe(true);
  });
});

describe('resolveCodeowner (last match wins)', () => {
  const rules = parseCodeowners(
    [
      '*                         @org/default',
      '/src/packages/core-domain/  @org/core-team',
      '/src/packages/core-domain/security/  @org/security',
    ].join('\n'),
  );

  it('falls back to the catch-all default', () => {
    expect(resolveCodeowner('README.md', rules)).toEqual(['@org/default']);
  });

  it('prefers the LAST (most specific, latest) matching rule', () => {
    expect(resolveCodeowner('src/packages/core-domain/a.ts', rules)).toEqual(['@org/core-team']);
    expect(resolveCodeowner('src/packages/core-domain/security/b.ts', rules)).toEqual(['@org/security']);
  });

  it('returns undefined for an empty/locationless path', () => {
    expect(resolveCodeowner('', rules)).toBeUndefined();
  });
});

describe('enrichViolationsWithCodeowners', () => {
  const rules = parseCodeowners('/src/  @org/core-team @arch-lead\n');

  it('sets owner (space-joined) without touching the fingerprint', () => {
    const v = makeViolation({
      ruleId: 'ADR-0002',
      tool: 'drift-gate',
      file: 'src/a.ts',
      severity: 'error',
      message: 'boundary',
    });
    const [enriched] = enrichViolationsWithCodeowners([v], rules);
    expect(enriched.owner).toBe('@org/core-team @arch-lead');
    expect(enriched.fingerprint).toBe(v.fingerprint);
  });

  it('never overwrites an existing owner and leaves unmatched files unchanged', () => {
    const owned = makeViolation({ ruleId: 'r', tool: 't', file: 'src/a.ts', severity: 'error', message: 'm', owner: '@keep' });
    const unmatched = makeViolation({ ruleId: 'r', tool: 't', file: 'lib/z.ts', severity: 'error', message: 'm' });
    const [a, b] = enrichViolationsWithCodeowners([owned, unmatched], rules);
    expect(a.owner).toBe('@keep');
    expect(b.owner).toBeUndefined();
  });
});
