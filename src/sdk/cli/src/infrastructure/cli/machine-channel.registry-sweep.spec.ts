/**
 * GT-580 criterion 2 — `--format json` writes DATA ONLY to stdout, for EVERY
 * command that offers the flag.
 *
 * WHY A SWEEP AND NOT A SAMPLE. `machine-channel.subprocess.spec.ts` already
 * pipes two hand-picked commands (`scaffold`, `init`) and parses their stdout.
 * That proves the guard works where it was pointed; it says nothing about the
 * thirty other commands that accept `--format json`, and nothing at all about
 * the command somebody adds next week. A machine consumer does not pipe the two
 * commands we happened to test — it pipes whichever one it needs, and one stray
 * progress line makes `JSON.parse` throw on the first byte while the command
 * still exits 0.
 *
 * WHY THE ENUMERATION COMES FROM THE REGISTRY. A hand-written list of commands
 * is a second source of truth that silently stops covering the CLI the moment a
 * command is added. This spec asks commander — the CLI's own registry, built
 * from the real `AppModule` — which commands declare a `--format` option, and
 * sweeps exactly those. A new `--format json` command is therefore in the sweep
 * on the day it is registered, without anybody remembering to add it.
 *
 * WHY THE DENOMINATOR IS ASSERTED. A sweep over an empty enumeration passes and
 * proves nothing — this board has repeatedly caught guards that had never once
 * been observed to fail. If the registry walk ever returns nothing (a changed
 * commander internal, a broken module graph), the floor assertion turns this
 * spec RED instead of letting it report a vacuous green.
 *
 * WHAT COUNTS AS CONFORMANCE. For each command: stdout must be exactly one
 * parseable JSON document — not "mostly JSON", not "JSON after a banner" — and
 * the exit status must be a member of the published taxonomy. Most invocations
 * here land on a FAILURE path (no satellite, no TTY, no required flag), which is
 * deliberate: the failure path is where prose leaks, and it is the path an agent
 * harness most needs to parse.
 *
 * OBSERVED RED. Commenting out `installMachineChannelGuard()` in `main.ts` and
 * re-running this sweep on 2026-07-29 turned `agents` (`┌  Evolith …`, a
 * `@clack/prompts` banner) and `init-wizard` (`Starting Evolith …`) DIRTY while
 * the other thirty stayed clean. The guard is what makes this spec green, and
 * removing it is caught.
 */
import { spawn } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { CommandFactory } from 'nest-commander';
import { Commander } from 'nest-commander/src/constants';
import { CLI_EXIT_CODES, CLI_EXIT_CODE_VALUES } from './exit-codes';

const CLI_ROOT = path.resolve(__dirname, '..', '..', '..');
const REPO_ROOT = path.resolve(CLI_ROOT, '..', '..', '..');
const TS_NODE_BIN = path.join(REPO_ROOT, 'node_modules', 'ts-node', 'dist', 'bin.js');
const CLI_ENTRY = path.join(CLI_ROOT, 'src', 'main.ts');
const TS_CONFIG = path.join(CLI_ROOT, 'tsconfig.test.json');

/**
 * The floor the enumeration may not fall through.
 *
 * 32 commands declared `--format` when this spec was written. The floor sits
 * just below so that adding commands never breaks the spec, while losing the
 * enumeration entirely — the failure mode that would make the sweep vacuous —
 * fails it immediately.
 */
const MIN_FORMAT_COMMANDS = 28;

/** Six cold ts-node boots at a time; the whole sweep is ~30 process starts. */
const CONCURRENCY = 6;
jest.setTimeout(900_000);

/**
 * Positional arguments for the commands whose `<action>` is required.
 *
 * These exist so the invocation reaches the command's own code instead of
 * stopping at commander's arity check. The values are read-only actions on
 * purpose: the sweep must not mutate anything, and a command that refuses the
 * argument is still a valid observation — its refusal must be a JSON document.
 */
const REQUIRED_ARGS: Readonly<Record<string, readonly string[]>> = {
  'patterns get': ['no-such-pattern'],
  'patterns for-topology': ['modular-monolith'],
  gate: ['status'],
  phase: ['status'],
  profile: ['show'],
  enforce: ['status'],
};

interface RegisteredCommand {
  /** Space-joined path as typed, e.g. `topology recommend`. */
  readonly path: string;
  readonly formatFlags: string;
}

/**
 * Ask the CLI's own commander registry which commands accept `--format`.
 *
 * Built from the real `AppModule`, so this is the same graph `main.ts` boots —
 * not a directory listing of `commands/`, which would also count files that
 * register nothing.
 */
async function enumerateFormatCommands(): Promise<RegisteredCommand[]> {
  const { AppModule } = await import('../../app.module');
  const app = await CommandFactory.createWithoutRunning(AppModule, { logger: false });
  try {
    // Structural access: the root workspace hoists a different major of
    // `commander` than nest-commander runs on, so its typings are not the
    // contract here (the same reasoning as `applyProgramName` in main.ts).
    const program = app.get<CommanderLike>(Commander, { strict: false });
    const found: RegisteredCommand[] = [];

    const walk = (command: CommanderLike, prefix: readonly string[]): void => {
      const trail = [...prefix, command.name()];
      const format = (command.options ?? []).find((option) => option.long === '--format');
      if (format) found.push({ path: trail.join(' '), formatFlags: format.flags });
      for (const child of command.commands ?? []) walk(child, trail);
    };

    for (const child of program.commands ?? []) walk(child, []);
    return found;
  } finally {
    await app.close();
  }
}

interface CommanderLike {
  name(): string;
  readonly options?: ReadonlyArray<{ long?: string; flags: string }>;
  readonly commands?: readonly CommanderLike[];
}

interface CliRun {
  readonly command: string;
  readonly stdout: string;
  readonly stderr: string;
  readonly status: number | null;
}

function runCli(command: RegisteredCommand): Promise<CliRun> {
  return new Promise((resolve, reject) => {
    // A fresh empty cwd per command: none of these may depend on, or touch, the
    // repository they are being tested from.
    const cwd = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'gt580-sweep-')));
    // The jest setup sets EVOLITH_FORCE_INTERACTIVE for in-process specs. A
    // piped subprocess is the machine case by definition and must not inherit it.
    const env: NodeJS.ProcessEnv = { ...process.env, NO_COLOR: '1' };
    delete env.EVOLITH_FORCE_INTERACTIVE;

    const argv = [
      TS_NODE_BIN,
      '--transpile-only',
      '--project',
      TS_CONFIG,
      CLI_ENTRY,
      ...command.path.split(' '),
      ...(REQUIRED_ARGS[command.path] ?? []),
      '--format',
      'json',
    ];

    // `pipe` on both is the whole point: the two channels must be observed apart.
    const child = spawn(process.execPath, argv, { cwd, stdio: ['ignore', 'pipe', 'pipe'], env });
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk: string) => (stdout += chunk));
    child.stderr.on('data', (chunk: string) => (stderr += chunk));
    child.on('error', reject);
    child.on('close', (status) => {
      fs.rmSync(cwd, { recursive: true, force: true });
      resolve({ command: command.path, stdout, stderr, status });
    });
  });
}

async function runAll(commands: readonly RegisteredCommand[]): Promise<CliRun[]> {
  const pending = [...commands];
  const runs: CliRun[] = [];
  const worker = async (): Promise<void> => {
    for (let next = pending.shift(); next; next = pending.shift()) {
      runs.push(await runCli(next));
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  return runs;
}

/** The classification, stated once so both assertions read the same way. */
function classify(run: CliRun): string {
  const text = run.stdout.trim();
  if (text.length === 0) return 'EMPTY (no document for a machine consumer to read)';
  try {
    const parsed: unknown = JSON.parse(text);
    if (parsed === null || typeof parsed !== 'object') return 'NOT-A-DOCUMENT (bare scalar)';
    return 'JSON';
  } catch (error) {
    const preview = text.slice(0, 60).replace(/\n/g, '\\n');
    return `DIRTY (${(error as Error).message}) first bytes: ${preview}`;
  }
}

describe('GT-580 · every `--format json` command in the registry pipes cleanly', () => {
  let commands: RegisteredCommand[];
  let runs: CliRun[];

  beforeAll(async () => {
    // A missing runner must be a RED test, never a skipped one.
    expect(fs.existsSync(TS_NODE_BIN)).toBe(true);
    commands = await enumerateFormatCommands();
    runs = await runAll(commands);
  });

  it('enumerates the `--format` commands from the CLI registry, and finds many', () => {
    // Guards the denominator: everything below is vacuous if this is empty.
    expect(commands.length).toBeGreaterThanOrEqual(MIN_FORMAT_COMMANDS);
    // Spot-check the walk actually descends into sub-commands rather than
    // listing only top-level ones.
    const paths = commands.map((c) => c.path);
    expect(paths).toEqual(expect.arrayContaining(['validate', 'evaluate', 'topology recommend', 'patterns list']));
    expect(runs).toHaveLength(commands.length);
  });

  it('writes exactly one JSON document to stdout, for every one of them', () => {
    const offenders = runs
      .map((run) => ({ command: run.command, verdict: classify(run) }))
      .filter((entry) => entry.verdict !== 'JSON');

    // Reported as a list so a regression names every command it broke, not just
    // the first one jest happened to reach.
    expect(offenders).toEqual([]);
  });

  it('exits from the published taxonomy, for every one of them', () => {
    const offenders = runs
      .filter((run) => !CLI_EXIT_CODE_VALUES.includes(run.status ?? -1))
      .map((run) => ({ command: run.command, status: run.status }));

    expect(offenders).toEqual([]);
  });

  it('exits `0` iff the envelope says `success: true` — never a taxonomy member merely', () => {
    // Membership in the taxonomy is necessary but not sufficient: a command
    // that exits 0 with `success: false` (or a non-zero code with `success:
    // true`) still hands a consumer branching on the exit code the wrong
    // verdict, and the "member of the taxonomy" assertion above cannot see it
    // because 0 and 1 and 2 and 3 are all valid members. This asserts the two
    // facts the envelope and the exit code each claim actually agree.
    const offenders: Array<{ command: string; status: number | null; success: unknown }> = [];
    for (const run of runs) {
      let envelope: unknown;
      try {
        envelope = JSON.parse(run.stdout.trim());
      } catch {
        continue; // already reported by the "writes exactly one JSON document" assertion
      }
      if (envelope === null || typeof envelope !== 'object' || !('success' in envelope)) continue;
      const success = (envelope as { success: unknown }).success;
      const exitsOk = run.status === CLI_EXIT_CODES.OK;
      if (success !== exitsOk) {
        offenders.push({ command: run.command, status: run.status, success });
      }
    }

    expect(offenders).toEqual([]);
  });

  it('keeps diagnostics on stderr rather than deleting them', () => {
    // The guard must be a channel rule, not a blunt silencer: the cheap "fix"
    // for a dirty stdout is to stop printing, and that would pass the two
    // assertions above while destroying every diagnostic a human needs.
    const withDiagnostics = runs.filter((run) => run.stderr.trim().length > 0);
    expect(withDiagnostics.length).toBeGreaterThan(0);
  });
});
