#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { INestApplicationContext } from '@nestjs/common';
import { initCliOtel, shutdownCliOtel } from './infrastructure/observability/otel-tracing';
import { CommandFactory } from 'nest-commander';
import { Commander } from 'nest-commander/src/constants';
import { AliasService } from './config/alias.service';
import { StderrLogger } from './infrastructure/observability/stderr-logger';
import { installMachineChannelGuard } from './infrastructure/cli/machine-channel';

/**
 * GT-571: the name every surface of the product documents. Commander derives the
 * program name from `basename(process.argv[1])`, which for the published bin is
 * `dist/main.js` -- so `--help` printed `Usage: main init [options]`. The name is
 * set explicitly here; the bin map exposes both `evolith` (documented) and
 * `evolith-cli` (compatibility), and both must self-identify as `evolith`.
 */
export const CLI_PROGRAM_NAME = 'evolith';

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

/**
 * Name the root commander program so help/usage/error text says `evolith`.
 *
 * nest-commander registers the root `Command` under its `Commander` token and
 * never names it, so the name falls back to the script basename. Resolution is
 * defensive: an unnameable program is a cosmetic failure and must never stop the
 * command from running.
 */
export function applyProgramName(app: INestApplicationContext, name: string = CLI_PROGRAM_NAME): boolean {
  try {
    // Structural type on purpose: the root workspace hoists a different major of
    // `commander` than the one nest-commander runs on, so its typings must not
    // be the contract here.
    const program = app.get<{ name(value: string): unknown }>(Commander, { strict: false });
    if (!program || typeof program.name !== 'function') return false;
    program.name(name);
    return true;
  } catch {
    return false;
  }
}

/**
 * Force synchronous writes on a piped stdout/stderr.
 *
 * Node buffers pipe writes asynchronously, so a `process.exit()` anywhere in the
 * command graph discards whatever has not been flushed — silently truncating the
 * output at the OS pipe buffer (64 KiB on macOS/Linux). That turns a large
 * `--format json` envelope into unparseable JSON for the exact consumer the
 * envelope exists for, and the failure is invisible when the output is small.
 *
 * Fixing it here rather than at each of the ~12 `process.exit()` sites means a
 * new command cannot reintroduce the bug by exiting the ordinary way.
 * `_handle.setBlocking` is internal, hence the total guard: if it is ever
 * removed, the CLI keeps working with the previous (truncating) behaviour rather
 * than crashing, and the regression test on the envelope will catch it.
 */
export function makeStdioBlocking(): void {
  for (const stream of [process.stdout, process.stderr]) {
    try {
      const handle = (stream as unknown as { _handle?: { setBlocking?: (v: boolean) => void } })._handle;
      handle?.setBlocking?.(true);
    } catch {
      /* not available on this platform or stream type — keep going */
    }
  }
}

export async function bootstrap(): Promise<void> {
  makeStdioBlocking();
  // GT-580: in `--format json`/`ndjson`, stdout is a pipe into `jq` or an agent
  // harness, not a display. Arm the channel guard BEFORE the command graph boots
  // — `@clack/prompts` and Nest both print during startup, straight to
  // `process.stdout`, and a guard installed after them protects nothing.
  installMachineChannelGuard();
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
  // Imported lazily so that importing this module (tests, embedders) does not
  // pull the entire command graph in as a side effect.
  const { AppModule } = await import('./app.module');
  // stdout is reserved for the ADR-0073 JSON envelope in `--format json` mode;
  // route all Nest diagnostics to stderr so they never corrupt a machine read.
  const app = await CommandFactory.createWithoutRunning(AppModule, {
    logger: new StderrLogger(),
    version: CLI_VERSION,
    cliName: CLI_PROGRAM_NAME,
  });
  applyProgramName(app);
  try {
    await CommandFactory.runApplication(app);
  } finally {
    await app.close();
  }
}

// Only auto-run when invoked as the process entrypoint, so the module can be
// imported (tests, embedders) without booting a Nest application context.
if (require.main === module) {
  initCliOtel();
  bootstrap()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => shutdownCliOtel());
}
