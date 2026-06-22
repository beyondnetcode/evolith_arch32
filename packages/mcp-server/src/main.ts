#!/usr/bin/env node
import './tracing';
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { McpServerService, McpTransport } from './mcp/mcp-server.service';
import { StderrLogger } from './common/stderr-logger';
import { shutdownOtel } from './tracing';

const VERSION = '1.0.0';

interface CliArgs {
  command: string;
  transport: McpTransport;
  port: number;
  apiKey?: string;
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

  const transport = (flag('--transport', '-t') ??
    env.TRANSPORT ??
    'stdio') as McpTransport;
  const port = parseInt(flag('--port', '-p') ?? env.PORT ?? '3000', 10) || 3000;
  const apiKey = flag('--api-key') ?? env.EVOLITH_API_KEY;

  return { command, transport, port, apiKey };
}

export interface StartMcpServerOptions {
  transport?: McpTransport;
  port?: number;
  apiKey?: string;
}

/**
 * Programmatic entry point. Boots the NestJS application context and starts the
 * MCP server on the requested transport. Consumers (e.g. the Smart CLI) call
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
  });

  return { app, server };
}

async function bootstrap(): Promise<void> {
  const cli = parseArgs(process.argv, process.env);

  if (cli.command === 'version') {
    process.stdout.write(`@evolith/mcp-server v${VERSION}\n`);
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
