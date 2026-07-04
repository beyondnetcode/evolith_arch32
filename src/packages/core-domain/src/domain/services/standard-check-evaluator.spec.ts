import { evaluateStandardCheck } from './standard-check-evaluator';

describe('evaluateStandardCheck (GT-350 — no arbitrary code execution)', () => {
  it('evaluates includes / startsWith / endsWith', () => {
    expect(evaluateStandardCheck("code.includes('foo')", 'a foo b')).toBe(true);
    expect(evaluateStandardCheck("code.includes('zzz')", 'a foo b')).toBe(false);
    expect(evaluateStandardCheck("code.startsWith('a ')", 'a foo')).toBe(true);
    expect(evaluateStandardCheck("code.endsWith('foo')", 'a foo')).toBe(true);
  });

  it('evaluates regex .test(code) with flags', () => {
    expect(evaluateStandardCheck('/fo+/.test(code)', 'foo')).toBe(true);
    expect(evaluateStandardCheck('/^bar/i.test(code)', 'BARxyz')).toBe(true);
    expect(evaluateStandardCheck('/missing/.test(code)', 'foo')).toBe(false);
  });

  it('supports ! negation and && / || combinators', () => {
    expect(evaluateStandardCheck("!code.includes('x')", 'abc')).toBe(true);
    expect(evaluateStandardCheck("code.includes('a') && code.includes('b')", 'ab')).toBe(true);
    expect(evaluateStandardCheck("code.includes('a') && code.includes('z')", 'ab')).toBe(false);
    expect(evaluateStandardCheck("code.includes('z') || code.includes('b')", 'ab')).toBe(true);
  });

  it('evaluates code.length comparisons', () => {
    expect(evaluateStandardCheck('code.length > 2', 'abc')).toBe(true);
    expect(evaluateStandardCheck('code.length < 2', 'abc')).toBe(false);
    expect(evaluateStandardCheck('code.length === 3', 'abc')).toBe(true);
  });

  it('treats an unsupported check as non-blocking (true) without throwing', () => {
    expect(evaluateStandardCheck('someUnknownThing(code)', 'x')).toBe(true);
  });

  it('does NOT execute arbitrary JS — malicious checks have no side effects', () => {
    delete (globalThis as Record<string, unknown>).__pwned;
    delete (globalThis as Record<string, unknown>).__pwned2;

    // Assignment payload: under new Function this would set the global.
    expect(evaluateStandardCheck('(globalThis.__pwned = true) || true', 'x')).toBe(true);
    expect((globalThis as Record<string, unknown>).__pwned).toBeUndefined();

    // Classic constructor sandbox-escape payload.
    expect(
      evaluateStandardCheck("code.constructor.constructor('globalThis.__pwned2=1')()", 'x'),
    ).toBe(true);
    expect((globalThis as Record<string, unknown>).__pwned2).toBeUndefined();
  });
});
