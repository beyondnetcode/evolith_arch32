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
  allowNoAuth: boolean;
}

/** Parse argv + environment into normalized start options. */
export function parseArgs(argv: string[], env: NodeJS.ProcessEnv): CliArgs {
  const args = argv.slice(2);
  const command = args.find((a) => !a.startsWith('-')) ?? 'serve';

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
// The stdio/local path is unchanged: OAuth applies only to the remote HTTP
// surface, and the shared API key / local HS256 JWT / dev `--allow-no-auth`
// paths still work for local development. Everything downstream of identity is
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

  if (cli.command !== 'serve') {
    process.stderr.write(
      `Unknown command: ${cli.command}. Usage: evolith-mcp serve [--transport stdio|http] [--port <n>]\n`,
    );
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

// Only auto-bootstrap when executed directly (not when imported by tests).
if (require.main === module) {
  bootstrap().catch((err) => {
    process.stderr.write(`Fatal: ${err instanceof Error ? err.stack : String(err)}\n`);
    process.exit(1);
  });
}
