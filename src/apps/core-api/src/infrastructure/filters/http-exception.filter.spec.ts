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

/**
 * GT-715 — what express's body parser throws is not an `HttpException`, and the
 * filter used to classify it by message: "request entity too large" matched
 * nothing, so an inline evaluation context over the 100 KB default came back as
 * a masked 500 "An unexpected error occurred" — with no log line, because the
 * filter never logged. The errors below are built the way `http-errors` builds
 * them (`type`, `status`, `expose`, and for 413 `limit`/`length`).
 */
function bodyParserError(shape: { type: string; status: number; message: string; limit?: number; length?: number }) {
  const { type, status, message, ...sizes } = shape;
  const err = new Error(message) as Error & Record<string, unknown>;
  err.name = status === 413 ? 'PayloadTooLargeError' : 'SyntaxError';
  Object.assign(err, { type, status, statusCode: status, expose: true }, sizes);
  return err;
}

describe('HttpExceptionFilter · GT-715', () => {
  afterEach(() => jest.restoreAllMocks());

  it('answers a body over the ceiling with 413 PAYLOAD_TOO_LARGE naming both sizes, not a masked 500', () => {
    const err = bodyParserError({ type: 'entity.too.large', status: 413, message: 'request entity too large', limit: 102400, length: 126556 });
    const { host, sent } = hostFor(err);

    new HttpExceptionFilter().catch(err, host);

    expect(sent.status).toBe(413);
    const body = sent.body as { success: boolean; error: { code: string; message: string; details: { title: string } } };
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('PAYLOAD_TOO_LARGE');
    expect(body.error.details.title).toBe('Payload Too Large');
    expect(body.error.message).toBe(
      'Request body too large: 126556 bytes received, the limit is 102400 bytes (EVOLITH_MAX_BODY_BYTES).',
    );
  });

  it('keeps the parser-chosen status for the other parser errors (malformed JSON is a 400, not a 500)', () => {
    const err = bodyParserError({ type: 'entity.parse.failed', status: 400, message: 'Unexpected token } in JSON at position 12' });
    const { host, sent } = hostFor(err);

    new HttpExceptionFilter().catch(err, host);

    expect(sent.status).toBe(400);
    expect((sent.body as { error: { code: string } }).error.code).toBe('BAD_REQUEST');
  });

  it('does not let the message matchers reclassify a parser error ("invalid" in the text stays a 400)', () => {
    const err = bodyParserError({ type: 'entity.parse.failed', status: 400, message: 'invalid json, required field missing' });
    const { host, sent } = hostFor(err);

    new HttpExceptionFilter().catch(err, host);

    expect(sent.status).toBe(400);
  });

  it('logs an unexpected 5xx with its stack so the operator can read what the client cannot', () => {
    const { Logger } = jest.requireActual<typeof import('@nestjs/common')>('@nestjs/common');
    const logged = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const err = new Error('boom');
    const { host, sent } = hostFor(err);

    new HttpExceptionFilter().catch(err, host);

    expect(sent.status).toBe(500);
    expect(logged).toHaveBeenCalledTimes(1);
    const [message, stack] = logged.mock.calls[0] as [string, string | undefined];
    expect(message).toMatch(/^POST \/api\/v1\/architecture\/validate-satellite -> 500 Error: boom/);
    expect(stack).toContain('boom');
  });

  it('stays quiet for a 4xx: the client already got the reason', () => {
    const { Logger } = jest.requireActual<typeof import('@nestjs/common')>('@nestjs/common');
    const logged = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const err = bodyParserError({ type: 'entity.too.large', status: 413, message: 'request entity too large', limit: 1, length: 2 });
    const { host } = hostFor(err);

    new HttpExceptionFilter().catch(err, host);

    expect(logged).not.toHaveBeenCalled();
  });
});
