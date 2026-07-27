/**
 * GT-572 — credential policy for the **stdio** transport.
 *
 * Background. stdio is a same-process, single-user channel: it exchanges no
 * per-request credential, so the transport either runs as an implicit principal
 * or it runs as nobody (and every `tools/call` is denied with ABAC-02 after the
 * server has already advertised its whole tool surface — the original GT-572
 * failure mode).
 *
 * The decision this module encodes:
 *
 *  - **Outside production** the implicit `local-session` principal is granted.
 *    The peer on the other end of stdin/stdout is the OS user who spawned the
 *    process and already owns the working tree the tools read and write. This is
 *    the documented `npx` / Claude Desktop configuration.
 *
 *  - **In production** it is NOT granted implicitly. stdio must present the same
 *    configured credential as every other production surface (`EVOLITH_API_KEY`
 *    or `--api-key`). Possession is proved at spawn time — there is no request to
 *    carry a header — so the credential is checked once, at startup.
 *
 *  - When that credential is absent the server **refuses to start** instead of
 *    booting a surface where all 50 tools deny. The refusal is written to stderr
 *    (stdout is the JSON-RPC stream) and names the variable to set.
 *
 * This never widens access: nothing here can turn a denial into an allow, and
 * the HTTP path does not consult it at all (see `authenticateHttpRequest`).
 */

/** Environment variable that carries the production stdio credential. */
export const STDIO_CREDENTIAL_ENV = 'EVOLITH_API_KEY';

/** CLI flag equivalent of {@link STDIO_CREDENTIAL_ENV}. */
export const STDIO_CREDENTIAL_FLAG = '--api-key';

/** Stable `code` on {@link StdioCredentialError} (survives dual module instances). */
export const STDIO_CREDENTIAL_ERROR_CODE = 'MCP_STDIO_CREDENTIAL_REQUIRED';

/**
 * Startup refusal message. Deliberately verbose: it is the whole point of the
 * change that an operator reading only stderr learns what went wrong and what to
 * type next, instead of getting a server that answers FORBIDDEN forever.
 */
export const STDIO_PRODUCTION_CREDENTIAL_MESSAGE = [
  'Refusing to start the MCP stdio transport: NODE_ENV=production and no API key is configured.',
  '',
  'Why: in production the stdio transport is NOT granted the local-session principal implicitly.',
  'It requires the same configured credential as every other production surface. Starting anyway',
  'would advertise the full tool surface and then deny every tools/call with FORBIDDEN (ABAC-02).',
  '',
  'What to do — pick one:',
  `  1. Configure the credential:  export ${STDIO_CREDENTIAL_ENV}=<key>`,
  `     (container: docker run -e ${STDIO_CREDENTIAL_ENV}=<key> …  ·  k8s: env/secretKeyRef)`,
  `  2. Pass it on the command line:  evolith-mcp serve --transport stdio ${STDIO_CREDENTIAL_FLAG} <key>`,
  '  3. For a local developer session, do not run as production: unset NODE_ENV (or set NODE_ENV=development).',
  '',
  'Note: --allow-no-auth / EVOLITH_MCP_ALLOW_NO_AUTH is an HTTP-only development switch and is',
  'deliberately not honoured here — it cannot substitute for the production credential.',
].join('\n');

/** Thrown by `McpServerService.start()` when the stdio credential is missing. */
export class StdioCredentialError extends Error {
  readonly code = STDIO_CREDENTIAL_ERROR_CODE;

  constructor(message: string = STDIO_PRODUCTION_CREDENTIAL_MESSAGE) {
    super(message);
    this.name = 'StdioCredentialError';
  }
}

/** Duck-typed check that survives a duplicated module instance. */
export function isStdioCredentialError(err: unknown): err is StdioCredentialError {
  return (
    err instanceof StdioCredentialError
    || (typeof err === 'object'
      && err !== null
      && (err as { code?: unknown }).code === STDIO_CREDENTIAL_ERROR_CODE)
  );
}

/** `NODE_ENV=production`, with the same default the rest of the server uses. */
export function isProductionEnvironment(env: NodeJS.ProcessEnv = process.env): boolean {
  return (env.NODE_ENV || 'development') === 'production';
}

export interface StdioCredentialDecision {
  /** Whether stdio may run as the implicit local-session principal. */
  granted: boolean;
  /** Whether the process considers itself production. */
  production: boolean;
  /** Actionable refusal text; present only when `granted` is false. */
  message?: string;
}

/**
 * Decide whether the stdio transport may boot.
 *
 * @param apiKey credential resolved from `--api-key` / `EVOLITH_API_KEY`.
 * @param env    environment to read `NODE_ENV` from (injectable for tests).
 */
export function evaluateStdioCredentialPolicy(options: {
  apiKey?: string;
  env?: NodeJS.ProcessEnv;
}): StdioCredentialDecision {
  const production = isProductionEnvironment(options.env ?? process.env);
  const hasCredential = typeof options.apiKey === 'string' && options.apiKey.trim() !== '';

  if (!production || hasCredential) {
    return { granted: true, production };
  }
  return { granted: false, production, message: STDIO_PRODUCTION_CREDENTIAL_MESSAGE };
}
