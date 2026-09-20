import type { ArgumentsHost } from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter';

/**
 * GT-678 — the REST surface answers an invalid rule-overrides document with
 * the SAME code the CLI (exit 3) and MCP report: `SCHEMA_INVALID`, 422.
 *
 * The filter classifies by error NAME (like `RulesetsNotFoundError` above it in
 * the registry), so the assertion builds a plain Error with that name rather
 * than importing the core-domain class across the package boundary.
 */
function hostFor(error: Error) {
  const sent: { status?: number; body?: unknown } = {};
  const response = {
    status: (code: number) => {
      sent.status = code;
      return response;
    },
    setHeader: () => response,
    json: (body: unknown) => {
      sent.body = body;
    },
  };
  const request = { headers: {}, query: {}, body: {}, url: '/api/v1/architecture/validate-satellite', method: 'POST' };
  const host = {
    switchToHttp: () => ({ getResponse: () => response, getRequest: () => request }),
  } as unknown as ArgumentsHost;
  return { host, sent, error };
}

describe('HttpExceptionFilter · GT-678', () => {
  it('maps RuleOverridesInvalidError to 422 SCHEMA_INVALID', () => {
    const err = new Error('governance/rule-overrides.json does not satisfy rule-overrides.schema.json: unknown key "enabeld"');
    err.name = 'RuleOverridesInvalidError';
    const { host, sent } = hostFor(err);

    new HttpExceptionFilter().catch(err, host);

    expect(sent.status).toBe(422);
    const body = sent.body as { success: boolean; error: { code: string; message: string } };
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('SCHEMA_INVALID');
    expect(body.error.message).toMatch(/enabeld/);
  });

  it('still maps RulesetsNotFoundError to 422 RULESET_NOT_FOUND (the registry entry above it is untouched)', () => {
    const err = new Error('no rulesets');
    err.name = 'RulesetsNotFoundError';
    const { host, sent } = hostFor(err);

    new HttpExceptionFilter().catch(err, host);

    expect(sent.status).toBe(422);
    expect((sent.body as { error: { code: string } }).error.code).toBe('RULESET_NOT_FOUND');
  });
});
