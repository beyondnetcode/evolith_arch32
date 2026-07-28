/**
 * GT-580 criterion 2, end to end — `--format json` writes DATA ONLY to stdout.
 *
 * This spec spawns a real CLI process with stdout and stderr on SEPARATE PIPES
 * and parses stdout, which is the only way to observe the defect: an in-process
 * spy on `console.log` sees our own calls and misses everything `@clack/prompts`
 * writes straight to `process.stdout`. Measured on 2026-07-28, `evolith scaffold
 * --runtime dotnet --format json` put eleven progress lines in front of its
 * ADR-0073 envelope, so `... | jq` failed on the first byte while the command
 * still exited 0 — a silent break for every consumer that pipes.
 *
 * WHY ts-node AND NOT `dist/main.js`. `dist/` is gitignored build output. A spec
 * that reads it is green when the build is stale and silently absent when the
 * build has not run — this repository already carries one such spec, and it
 * `console.warn`s and returns instead of failing. Running the TypeScript sources
 * removes that whole class of false green: `ts-node` is pinned in the committed
 * lockfile, so `npm ci` puts it there deterministically, and if it is ever
 * dropped this spec FAILS rather than skipping.
 */
import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

const CLI_ROOT = path.resolve(__dirname, '..', '..', '..');
const REPO_ROOT = path.resolve(CLI_ROOT, '..', '..', '..');
const TS_NODE_BIN = path.join(REPO_ROOT, 'node_modules', 'ts-node', 'dist', 'bin.js');
const CLI_ENTRY = path.join(CLI_ROOT, 'src', 'main.ts');
const TS_CONFIG = path.join(CLI_ROOT, 'tsconfig.test.json');

// Three cold ts-node boots, ~10s each on a loaded machine.
jest.setTimeout(300_000);

interface CliRun {
  stdout: string;
  stderr: string;
  status: number | null;
}

function runCli(args: string[], cwd: string): CliRun {
  // The jest setup sets EVOLITH_FORCE_INTERACTIVE for in-process specs. A piped
  // subprocess is the machine case by definition, so it must not inherit it.
  const env: NodeJS.ProcessEnv = { ...process.env, NO_COLOR: '1' };
  delete env.EVOLITH_FORCE_INTERACTIVE;

  const result = spawnSync(
    process.execPath,
    [TS_NODE_BIN, '--transpile-only', '--project', TS_CONFIG, CLI_ENTRY, ...args],
    // `pipe` on both is the whole point: the two channels must be observed apart.
    { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], env },
  );
  if (result.error) throw result.error;
  return { stdout: result.stdout ?? '', stderr: result.stderr ?? '', status: result.status };
}

describe('GT-580 · --format json is a machine channel (piped subprocess)', () => {
  let workdir: string;

  beforeAll(() => {
    // A missing runner must be a RED test, never a skipped one.
    expect(fs.existsSync(TS_NODE_BIN)).toBe(true);
    workdir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'gt580-pipe-')));
  });

  afterAll(() => {
    fs.rmSync(workdir, { recursive: true, force: true });
  });

  it('a command that streams step progress still hands `jq` one parseable document', () => {
    // The recorded offender. `--dry-run` keeps it offline and free of the .NET SDK.
    const run = runCli(
      ['scaffold', '--runtime', 'dotnet', '--dry-run', '--format', 'json', '--api-name', 'probe-api', '--phase', '1'],
      workdir,
    );

    // Parses in full — no prefix, no suffix, no interleaving.
    const envelope = JSON.parse(run.stdout);
    expect(envelope.success).toBe(true);
    expect(envelope.meta.schemaVersion).toBeDefined();
    expect(run.status).toBe(0);

    // The progress did not vanish; it moved to the channel it belongs on.
    expect(run.stderr).toContain('[DRY-RUN]');
    expect(run.stdout).not.toContain('[DRY-RUN]');
  });

  it('`init --format json` emits exactly one document and nothing else', () => {
    const target = fs.mkdtempSync(path.join(workdir, 'sat-'));
    const run = runCli(['init', '--name', 'my-sat', '--yes', '--format', 'json'], target);

    const envelope = JSON.parse(run.stdout);
    expect(envelope.success).toBe(true);
    expect(envelope.data.targetDir).toBe(fs.realpathSync(target));
    expect(run.status).toBe(0);

    // The structured logger is live in this process and must stay off stdout.
    expect(run.stderr).toContain('InitCommand');
  });

  it('human mode is untouched: prose still goes to stdout', () => {
    // The guard must be a channel rule, not a blunt silencer — without this the
    // "fix" would be to send everything to stderr and call stdout clean.
    const run = runCli(
      ['scaffold', '--runtime', 'dotnet', '--dry-run', '--api-name', 'probe-api', '--phase', '1'],
      workdir,
    );

    expect(run.stdout).toContain('[DRY-RUN]');
    expect(run.status).toBe(0);
  });
});
