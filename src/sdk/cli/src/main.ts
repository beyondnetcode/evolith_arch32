#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { initCliOtel, shutdownCliOtel } from './infrastructure/observability/otel-tracing';
import { CommandFactory } from 'nest-commander';
import { AppModule } from './app.module';
import { AliasService } from './config/alias.service';

/** GT-345: read the CLI version from the package manifest so `--version` works and never drifts. */
const CLI_VERSION: string = (() => {
  try {
    return (
      (JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf-8')) as { version?: string }).version ||
      '0.0.0'
    );
  } catch {
    return '0.0.0';
  }
})();

initCliOtel();

async function bootstrap() {
  // Resolve possible alias for the first command argument
  const aliasService = new AliasService();
  const args = process.argv.slice(2);
  if (args.length > 0) {
    const resolved = aliasService.resolve(args[0]);
    if (resolved !== args[0]) {
      args[0] = resolved;
      // Rebuild argv with resolved command
      process.argv = [process.argv[0], process.argv[1], ...args];
    }
  }
  await CommandFactory.run(AppModule, { logger: ['warn', 'error'], version: CLI_VERSION });
}

bootstrap()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => shutdownCliOtel());
