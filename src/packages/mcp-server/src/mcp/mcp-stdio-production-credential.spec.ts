import { PassThrough } from 'node:stream';
import { McpServerService } from './mcp-server.service';
import { MetricsService } from './metrics.service';
import { ToolRegistryService } from './tool-registry.service';
import { AbacEvaluator } from './abac-evaluator';
import { McpTool } from './tool.interface';
import { ErrorCodes } from '../common/errors';
import {
  evaluateStdioCredentialPolicy,
  isStdioCredentialError,
  STDIO_CREDENTIAL_ENV,
  StdioCredentialError,
} from './stdio-credential-policy';
import { describeAbacDenial } from './abac-denial-remediation';
import { CONFIG_ERROR_EXIT_CODE, formatFatalStartupError } from '../main';

/**
 * GT-572, second pass — stdio under `NODE_ENV=production`.
 *
 * The first pass gave stdio an explicit local-session principal, which fixed the
 * documented (non-production) configuration. Under `NODE_ENV=production` — which
 * is exactly what the Docker images set — every tools/call still came back as a
 * bare `FORBIDDEN`, after the server had already advertised its 50 tools.
 *
 * The decision implemented here deliberately does NOT widen access:
 *
 *  - production stdio is not granted the local-session principal implicitly; it
 *    requires the configured API key like any other production surface;
 *  - without that credential the server REFUSES TO START, loudly, on stderr,
 *    naming the variable to set — it does not boot a surface that denies
 *    everything;
 *  - a denial that does happen has to say why and what to do, not just `ABAC-02`.
 *
 * Only the OPA layer is stubbed to abstain (policy.wasm is a gitignored build
 * artifact whose presence is nondeterministic); native ABAC is the real one.
 */
class NativeOnlyAbac extends AbacEvaluator {
  override async evaluateOpa() {
    return { allowed: true, violations: [] };
  }
}

/** An evaluator that reproduces the container failure: no compiled policy bundle. */
class MissingPolicyAbac extends AbacEvaluator {
  override async evaluateOpa() {
    return {
      allowed: false,
      violations: [{
        id: 'ABAC_POLICY_MISSING',
        message: 'ABAC policy not found at /repo/src/sdk/cli/rulesets/opa/policy.wasm; denying in production (fail-closed).',
      }],
    };
  }
}

function tool(name: string, execute: McpTool['execute'], mutative = false): McpTool {
  return {
    schema: { name, description: 'd', inputSchema: { type: 'object', properties: {} } },
    mutative,
    execute,
  };
}

function buildService(abac: AbacEvaluator, tools: McpTool[] = []): McpServerService {
  return new McpServerService(new ToolRegistryService(tools), new MetricsService(), abac);
}

describe('GT-572 — stdio startup under NODE_ENV=production', () => {
  const previousNodeEnv = process.env.NODE_ENV;
  let service: McpServerService | undefined;

  beforeEach(() => {
    process.env.NODE_ENV = 'production';
  });

  afterEach(async () => {
    await service?.stop();
    service = undefined;
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
  });

  it('refuses to start without a configured credential, naming the variable to set', async () => {
    service = buildService(new NativeOnlyAbac(), [tool('evolith-evaluate', async () => ({ verdict: 'PASS' }))]);
    const errorLog = jest.spyOn((service as unknown as { logger: { error: (m: string) => void } }).logger, 'error')
      .mockImplementation(() => undefined);
    const stdin = new PassThrough();
    const stdout = new PassThrough();

    // Before the fix start() resolved and the server happily advertised its tools.
    await expect(service.start({ transport: 'stdio', stdin, stdout })).rejects.toBeInstanceOf(StdioCredentialError);

    const logged = errorLog.mock.calls.map((c) => String(c[0])).join('\n');
    expect(logged).toContain(STDIO_CREDENTIAL_ENV);
    expect(logged).toContain('--api-key');
    expect(logged).toContain('NODE_ENV=production');
    errorLog.mockRestore();

    // And nothing was advertised: the transport was never connected, so a request
    // that reaches dispatch anyway is still refused (no principal was installed).
    const result = await service.handleCallTool('evolith-evaluate', {});
    expect(result.isError).toBe(true);
    expect(JSON.parse(result.content[0].text).error.code).toBe(ErrorCodes.FORBIDDEN);
  });

  it('serves a real verdict over stdio in production once the credential is configured', async () => {
    service = buildService(new NativeOnlyAbac(), [tool('evolith-evaluate', async () => ({ verdict: 'FAIL' }))]);
    const stdin = new PassThrough();
    const stdout = new PassThrough();

    await service.start({ transport: 'stdio', stdin, stdout, apiKey: 'production-key' });

    const result = await service.handleCallTool('evolith-evaluate', {});
    const envelope = JSON.parse(result.content[0].text);
    expect(result.isError).toBeFalsy();
    expect(envelope.success).toBe(true);
    expect(envelope.data.verdict).toBe('FAIL');
  });

  it('still starts implicitly outside production (the documented npx configuration)', async () => {
    process.env.NODE_ENV = 'development';
    service = buildService(new NativeOnlyAbac(), [tool('evolith-evaluate', async () => ({ verdict: 'PASS' }))]);
    const stdin = new PassThrough();
    const stdout = new PassThrough();

    await expect(service.start({ transport: 'stdio', stdin, stdout })).resolves.toBeUndefined();
    expect(JSON.parse((await service.handleCallTool('evolith-evaluate', {})).content[0].text).success).toBe(true);
  });

  it('does not accept --allow-no-auth as a substitute for the production credential', async () => {
    service = buildService(new NativeOnlyAbac());
    jest.spyOn((service as unknown as { logger: { error: (m: string) => void } }).logger, 'error')
      .mockImplementation(() => undefined);
    const stdin = new PassThrough();
    const stdout = new PassThrough();

    await expect(
      service.start({ transport: 'stdio', allowNoAuth: true, stdin, stdout }),
    ).rejects.toBeInstanceOf(StdioCredentialError);
  });

  it('leaves the HTTP transport exactly as fail-closed as before (no startup refusal, 401 at the door)', async () => {
    service = buildService(new NativeOnlyAbac(), [tool('evolith-evaluate', async () => ({ verdict: 'PASS' }))]);
    // HTTP in production with no credential must still START (it answers 401 per
    // request); only stdio refuses, because stdio has no per-request challenge.
    await expect(service.start({ transport: 'http', port: 0 })).resolves.toBeUndefined();

    const result = await service.handleCallTool('evolith-evaluate', {});
    expect(result.isError).toBe(true);
    expect(JSON.parse(result.content[0].text).error.message).toContain('No roles present');
  });
});

describe('GT-572 — the credential policy itself', () => {
  it('grants outside production regardless of the credential', () => {
    expect(evaluateStdioCredentialPolicy({ env: { NODE_ENV: 'development' } })).toMatchObject({ granted: true, production: false });
    expect(evaluateStdioCredentialPolicy({ env: {} })).toMatchObject({ granted: true, production: false });
  });

  it('requires a non-blank credential in production', () => {
    expect(evaluateStdioCredentialPolicy({ env: { NODE_ENV: 'production' } }).granted).toBe(false);
    expect(evaluateStdioCredentialPolicy({ env: { NODE_ENV: 'production' }, apiKey: '   ' }).granted).toBe(false);
    expect(evaluateStdioCredentialPolicy({ env: { NODE_ENV: 'production' }, apiKey: 'k' }).granted).toBe(true);
  });

  it('carries an actionable message on refusal', () => {
    const { message } = evaluateStdioCredentialPolicy({ env: { NODE_ENV: 'production' } });
    expect(message).toContain(STDIO_CREDENTIAL_ENV);
    expect(message).toContain('What to do');
    expect(message).toContain('NODE_ENV=development');
  });

  it('recognises its own error across module instances', () => {
    expect(isStdioCredentialError(new StdioCredentialError())).toBe(true);
    expect(isStdioCredentialError({ code: 'MCP_STDIO_CREDENTIAL_REQUIRED' })).toBe(true);
    expect(isStdioCredentialError(new Error('boom'))).toBe(false);
  });
});

describe('GT-572 — a denial says why and what to do', () => {
  const previousNodeEnv = process.env.NODE_ENV;
  let service: McpServerService | undefined;

  afterEach(async () => {
    await service?.stop();
    service = undefined;
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
  });

  it('turns a bare ABAC-02 into an instruction', async () => {
    service = buildService(new NativeOnlyAbac(), [tool('evolith-evaluate', async () => ({ verdict: 'PASS' }))]);
    await service.start({ transport: 'http', port: 0, apiKey: 'secret' });

    const message = JSON.parse((await service.handleCallTool('evolith-evaluate', {})).content[0].text).error.message;
    expect(message).toContain('ABAC-02');            // the machine-readable id survives
    expect(message).toContain('What to do');         // …and is no longer all the caller gets
    expect(message).toContain(STDIO_CREDENTIAL_ENV);
    expect(message).toContain('x-api-key');
  });

  it('tells the operator how to repair a missing OPA policy bundle', async () => {
    process.env.NODE_ENV = 'production';
    service = buildService(new MissingPolicyAbac(), [tool('evolith-evaluate', async () => ({ verdict: 'PASS' }))]);
    const stdin = new PassThrough();
    const stdout = new PassThrough();
    await service.start({ transport: 'stdio', stdin, stdout, apiKey: 'production-key' });

    const message = JSON.parse((await service.handleCallTool('evolith-evaluate', {})).content[0].text).error.message;
    expect(message).toContain('ABAC_POLICY_MISSING');
    expect(message).toContain('build:policy');
  });

  it('adds nothing when no violation id is recognised', () => {
    expect(describeAbacDenial([{ id: 'SOMETHING-ELSE', message: 'x' }])).toBe('');
    expect(describeAbacDenial([])).toBe('');
  });

  it('does not repeat the same remediation twice', () => {
    const advice = describeAbacDenial([
      { id: 'ABAC-02', message: 'a' },
      { id: 'ABAC-02', message: 'b' },
    ]);
    expect(advice.match(/No principal was established/g)).toHaveLength(1);
  });
});

describe('GT-572 — the process exits on a configuration problem, without a stack trace', () => {
  it('prints the actionable message alone and exits EX_CONFIG', () => {
    const formatted = formatFatalStartupError(new StdioCredentialError());
    expect(formatted.exitCode).toBe(CONFIG_ERROR_EXIT_CODE);
    expect(formatted.message).not.toContain('Fatal:');
    expect(formatted.message).toContain(STDIO_CREDENTIAL_ENV);
  });

  it('keeps the previous prefix + stack + exit 1 for anything else', () => {
    const formatted = formatFatalStartupError(new Error('boom'));
    expect(formatted.exitCode).toBe(1);
    expect(formatted.message).toContain('Fatal: Error: boom');
  });
});
