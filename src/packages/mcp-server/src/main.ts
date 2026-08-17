#!/usr/bin/env node
import './tracing';
import 'reflect-metadata';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { McpServerService, McpTransport } from './mcp/mcp-server.service';
import { StderrLogger } from './common/stderr-logger';
import { shutdownOtel } from './tracing';
import { isStdioCredentialError } from './mcp/stdio-credential-policy';

/**
 * Single source of truth for the reported version: read it from the package
 * manifest at runtime so the binary banner and `version` command can never
 * drift from package.json (GAP MCP-VERSION).
 */
const VERSION: string = (() => {
  try {
    return (
      (JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf-8')) as { version?: string }).version ||
      '0.0.0'
    );
  } catch {
    return '0.0.0';
  }
})();

interface CliArgs {
  command: string;
  transport: McpTransport;
  port: number;
  apiKey?: string;
  /**
   * HTTP-ONLY (GT-572). Starts the Streamable HTTP transport without an API key
   * and grants each request the dev reader context (never in production). It has
   * nothing to bypass on stdio — that transport authenticates no requests and
   * always runs as the local-session principal — so `start()` logs a warning
   * instead of accepting it silently.
   */
  allowNoAuth: boolean;
}

const USAGE =
  'Usage: evolith-mcp serve [--transport stdio|http] [--port <n>] [--api-key <key>] '
  + '[--allow-no-auth (http only)]';

/** Parse argv + environment into normalized start options. */
export function parseArgs(argv: string[], env: NodeJS.ProcessEnv): CliArgs {
  const args = argv.slice(2);

  // `--version` and `--help` are flags by shape and commands by intent. Without
  // this, the `find` below skips anything starting with `-`, `command` falls back
  // to 'serve', and `evolith-mcp --version` BOOTS THE MCP SERVER instead of
  // answering. Measured against the published 1.3.2:
  //
  //   stdin closed  -> exit 0, stdout EMPTY   (the stdio transport takes EOF and leaves)
  //   stdin open    -> never returns          (timed out at 10s, printed nothing)
  //
  // The second is what a terminal, a doctor script or a CI probe actually does,
  // and asking a binary its version is the first thing anyone does after
  // installing it. `evolith-mcp version` already worked; only the flag spelling
  // did not, which is the spelling everyone reaches for first.
  // A second defect the tests for the first one exposed: the old `find` also
  // matched a FLAG'S VALUE. `evolith-mcp --transport http` resolved command to
  // 'http' and died with `Unknown command: http`, because `http` is the first
  // token not starting with `-`. So classify once, skipping the value each
  // value-taking flag consumes, and read both answers off that.
  const VALUE_FLAGS = new Set(['--transport', '-t', '--port', '-p', '--api-key']);
  const free: string[] = [];
  for (let i = 0; i < args.length; i++) {
    if (VALUE_FLAGS.has(args[i])) {
      i++; // its value is not a command, and not a version flag either
      continue;
    }
    free.push(args[i]);
  }

  const asCommand = free.some((a) => a === '--version' || a === '-v' || a === '-V')
    ? 'version'
    : free.some((a) => a === '--help' || a === '-h')
      ? 'help'
      : undefined;
  const command = asCommand ?? free.find((a) => !a.startsWith('-')) ?? 'serve';

  const flag = (long: string, short?: string): string | undefined => {
    for (let i = 0; i < args.length; i++) {
      if (args[i] === long || (short && args[i] === short)) return args[i + 1];
      if (args[i].startsWith(`${long}=`)) return args[i].split('=')[1];
    }
    return undefined;
  };

  const hasFlag = (long: string, short?: string): boolean => {
    for (let i = 0; i < args.length; i++) {
      if (args[i] === long || (short && args[i] === short)) return true;
      if (args[i].startsWith(`${long}=`)) return true;
    }
    return false;
  };

  const transport = (flag('--transport', '-t') ??
    env.TRANSPORT ??
    'stdio') as McpTransport;
  const port = parseInt(flag('--port', '-p') ?? env.PORT ?? '3000', 10) || 3000;
  const apiKey = flag('--api-key') ?? env.EVOLITH_API_KEY;
  const allowNoAuth = hasFlag('--allow-no-auth')
    || env.EVOLITH_MCP_ALLOW_NO_AUTH === 'true';

  return { command, transport, port, apiKey, allowNoAuth };
}

export interface StartMcpServerOptions {
  transport?: McpTransport;
  port?: number;
  apiKey?: string;
  allowNoAuth?: boolean;
}

// ---------------------------------------------------------------------------
// GT-520 · EAG-15 / AC1 — OAuth 2.1 bearer over Streamable HTTP: IMPLEMENTED
// (IdP-agnostic); the concrete IdP choice remains gated on EAG-01.
//
// The Streamable HTTP transport ships (see McpServerService.startHttp). Remote
// requests are now authenticated by a GENERIC OAuth 2.1 resource-server
// validator (oauth-resource-server.ts): when the OAuth env is set, a
// `Authorization: Bearer <jwt>` is verified against the configured issuer's
// JWKS (RS/PS/ES families) or a shared HS secret, with iss/aud/exp/nbf enforced,
// and the VERIFIED claims map to McpUserContext — the identity that flows into
// per-identity ABAC. An unauthenticated remote request (no/invalid/expired
// bearer, no other credential) is rejected with 401 (mcp-server-auth.ts →
// authenticateHttpRequest). Configure via env (no code change per IdP):
//
//   EVOLITH_MCP_OAUTH_ISSUER   — expected `iss` (required to enable OAuth)
//   EVOLITH_MCP_OAUTH_JWKS_URI — issuer JWKS endpoint (asymmetric tokens)
//   EVOLITH_MCP_OAUTH_SECRET   — shared secret (symmetric HS* tokens)
//   EVOLITH_MCP_OAUTH_AUDIENCE — expected `aud` (optional but recommended)
//
// GATED (EAG-01): the SELECTION of the concrete IdP — which provider, one shared
// IdP vs per-tenant, and the token audience model — is an org decision tracked
// in the Tracker. The validator is deliberately not wired to any single vendor;
// it works against any standards-compliant OAuth 2.1 / OIDC issuer once EAG-01
// picks one and its issuer/JWKS/audience are supplied via the env above.
//
// OAuth applies only to the remote HTTP surface; the shared API key / local
// HS256 JWT / dev `--allow-no-auth` paths still work for local HTTP development.
// The stdio path exchanges no per-request credential (it is a same-process,
// single-user channel) and instead runs as the explicit `local-session`
// principal — see createLocalSessionContext in mcp-auth-contexts.ts (GT-572).
// That principal is implicit ONLY outside production: with NODE_ENV=production
// stdio requires the configured API key like any other production surface, and
// `start()` REFUSES TO BOOT without it (stdio-credential-policy.ts) rather than
// advertising a tool surface that would deny every call.
// Everything downstream of identity is
// already hardened per-identity: the dispatcher runs ABAC (native + OPA) on
// EVERY tools/call and audits the verdict (see McpServerService.handleCallTool),
// so it is agnostic to how the identity was established.
// ---------------------------------------------------------------------------

/**
 * Programmatic entry point. Boots the NestJS application context and starts the
 * MCP server on the requested transport. Consumers (e.g. the Evolith CLI) call
 * this to delegate to the standalone gateway instead of running their own.
 */
export async function startMcpServer(options: StartMcpServerOptions = {}): Promise<{
  app: Awaited<ReturnType<typeof NestFactory.createApplicationContext>>;
  server: McpServerService;
}> {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: new StderrLogger(),
  });
  app.enableShutdownHooks();

  const server = app.get(McpServerService);
  await server.start({
    transport: options.transport ?? 'stdio',
    port: options.port ?? 3000,
    apiKey: options.apiKey,
    allowNoAuth: options.allowNoAuth,
  });

  return { app, server };
}

async function bootstrap(): Promise<void> {
  const cli = parseArgs(process.argv, process.env);

  if (cli.command === 'version') {
    process.stdout.write(`@beyondnet/evolith-mcp v${VERSION}\n`);
    return;
  }

  if (cli.command === 'help') {
    process.stdout.write(`${USAGE}\n`);
    return;
  }

  if (cli.command !== 'serve') {
    process.stderr.write(`Unknown command: ${cli.command}. ${USAGE}\n`);
    process.exitCode = 1;
    return;
  }

  const { app, server } = await startMcpServer({
    transport: cli.transport,
    port: cli.port,
    apiKey: cli.apiKey,
    allowNoAuth: cli.allowNoAuth,
  });

  const shutdown = async (): Promise<void> => {
    await server.stop();
    await app.close();
    await shutdownOtel();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

/** sysexits(3) EX_CONFIG — the process is misconfigured, not broken. */
export const CONFIG_ERROR_EXIT_CODE = 78;

/**
 * GT-572 — render a startup failure for stderr.
 *
 * A missing stdio credential is a configuration problem with a known remedy, so
 * it prints the actionable message on its own (no `Fatal:` prefix, no stack
 * trace burying the instruction) and exits with EX_CONFIG. Everything else keeps
 * the previous behaviour: prefix + stack + exit 1.
 *
 * Exported so the formatting is unit-testable without spawning a process.
 */
export function formatFatalStartupError(err: unknown): { message: string; exitCode: number } {
  if (isStdioCredentialError(err)) {
    return { message: `${err.message}\n`, exitCode: CONFIG_ERROR_EXIT_CODE };
  }
  return {
    message: `Fatal: ${err instanceof Error ? err.stack : String(err)}\n`,
    exitCode: 1,
  };
}

// Only auto-bootstrap when executed directly (not when imported by tests).
if (require.main === module) {
  bootstrap().catch((err) => {
    const { message, exitCode } = formatFatalStartupError(err);
    process.stderr.write(message);
    process.exit(exitCode);
  });
}
