/**
 * GT-575 — the governed LLM egress primitives.
 *
 * These are the controls the repository already ran against itself in
 * `.harness/scripts/ci/agentic/` and that the SHIPPED provider had none of.
 */

import {
  DEFAULT_EGRESS_BUDGET,
  enforceEgressBudget,
  estimateTokens,
  LlmEgressBudgetError,
  LlmResponseSchemaError,
  parseAndValidateJson,
  redactSecrets,
  validateJsonSchema,
  type JsonSchemaNode,
} from './llm-egress';

describe('redactSecrets (ported from review-input.mjs)', () => {
  const cases: Array<[string, string, string]> = [
    ['PEM private key', '-----BEGIN RSA PRIVATE KEY-----\nabc\n-----END RSA PRIVATE KEY-----', 'abc'],
    ['JWT', 'auth eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dBjftJeZ4CVPmB92K27uhbUJU1p1r_wW1gFWFOEjXk', 'eyJhbGciOiJIUzI1NiJ9'],
    ['AWS access key', 'id=AKIAIOSFODNN7EXAMPLE rest', 'AKIAIOSFODNN7EXAMPLE'],
    ['Google API key', 'AIzaSyD-1234567890abcdefghijklmnopqrstu ok', 'AIzaSyD-1234567890abcdefghijklmnopqrstu'],
    ['GitHub PAT', 'ghp_012345678901234567890123456789012345 ok', 'ghp_012345678901234567890123456789012345'],
    ['Slack token', 'xoxb-1234567890-abcdefghij ok', 'xoxb-1234567890-abcdefghij'],
    ['Bearer token', 'Authorization: Bearer abcdefghijklmnop', 'abcdefghijklmnop'],
    ['generic assignment', 'GEMINI_API_KEY = "sk-supersecretvalue123"', 'sk-supersecretvalue123'],
  ];

  it.each(cases)('redacts a %s before egress', (_label, input, secret) => {
    const { text, redactions } = redactSecrets(input);
    expect(text).not.toContain(secret);
    expect(redactions).toBeGreaterThan(0);
  });

  it('covers eight distinct secret classes and counts every hit', () => {
    const blob = cases.map(([, input]) => input).join('\n');
    const { text, redactions } = redactSecrets(blob);
    expect(redactions).toBeGreaterThanOrEqual(8);
    for (const [, , secret] of cases) expect(text).not.toContain(secret);
  });

  it('leaves innocuous text untouched', () => {
    const { text, redactions } = redactSecrets('just a normal prompt about architecture');
    expect(text).toBe('just a normal prompt about architecture');
    expect(redactions).toBe(0);
  });
});

describe('enforceEgressBudget (fail closed, never truncate)', () => {
  it('accepts a payload inside the budget and reports usage', () => {
    const usage = enforceEgressBudget('x'.repeat(100), { maxBytes: 1000, maxTokens: 1000 });
    expect(usage).toEqual({ bytes: 100, estTokens: 25 });
  });

  it('THROWS on a byte overflow instead of trimming the prompt', () => {
    expect(() => enforceEgressBudget('x'.repeat(101), { maxBytes: 100, maxTokens: 10_000 })).toThrow(
      LlmEgressBudgetError,
    );
  });

  it('THROWS on a token overflow', () => {
    expect(() => enforceEgressBudget('x'.repeat(4001), { maxBytes: 1_000_000, maxTokens: 1000 })).toThrow(
      /exceeds the 1000-token budget/,
    );
  });

  it('ships a non-infinite default budget', () => {
    expect(DEFAULT_EGRESS_BUDGET.maxBytes).toBe(60_000);
    expect(DEFAULT_EGRESS_BUDGET.maxTokens).toBe(15_000);
    expect(() => enforceEgressBudget('x'.repeat(60_001))).toThrow(LlmEgressBudgetError);
  });

  it('estimates tokens over bytes, not characters', () => {
    expect(estimateTokens('abcd')).toBe(1);
    expect(estimateTokens('€€€€')).toBe(3); // 12 bytes
  });
});

describe('validateJsonSchema / parseAndValidateJson (no bare casts)', () => {
  const schema: JsonSchemaNode = {
    type: 'object',
    required: ['verdict', 'findings'],
    properties: {
      verdict: { type: 'string', enum: ['pass', 'fail'] },
      findings: { type: 'array', items: { type: 'object', required: ['title'], properties: { title: { type: 'string' } } } },
      score: { type: 'number' },
    },
  };

  it('accepts a conforming payload', () => {
    const value = parseAndValidateJson<{ verdict: string }>('{"verdict":"pass","findings":[]}', schema);
    expect(value.verdict).toBe('pass');
  });

  it('rejects a missing required key', () => {
    expect(() => parseAndValidateJson('{"verdict":"pass"}', schema)).toThrow(/\$\.findings is required/);
  });

  it('rejects an out-of-enum value', () => {
    expect(() => parseAndValidateJson('{"verdict":"maybe","findings":[]}', schema)).toThrow(
      /must be one of \[pass, fail\]/,
    );
  });

  it('rejects a wrong nested type', () => {
    expect(() => parseAndValidateJson('{"verdict":"pass","findings":[{"title":7}]}', schema)).toThrow(
      /\$\.findings\[0\]\.title must be a string/,
    );
  });

  it('rejects a JSON array where an object is declared', () => {
    expect(() => parseAndValidateJson('[1,2,3]')).toThrow(LlmResponseSchemaError);
  });

  it('rejects non-JSON without echoing the raw body', () => {
    let caught: unknown;
    try {
      parseAndValidateJson('sorry, I cannot do that — SECRET=abcdefghijklmnop');
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(LlmResponseSchemaError);
    expect((caught as Error).message).not.toContain('abcdefghijklmnop');
  });

  it('reports every violation at once', () => {
    const errors = validateJsonSchema({ verdict: 1, score: 'x' }, schema);
    expect(errors).toEqual(
      expect.arrayContaining(['$.findings is required', '$.verdict must be a string', '$.score must be a number']),
    );
  });
});
