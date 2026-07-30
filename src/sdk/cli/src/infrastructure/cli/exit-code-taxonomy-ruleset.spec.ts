/**
 * GT-580 criterion 3, end to end — the RULESET fails a command that exits
 * outside the taxonomy.
 *
 * Three artifacts have to agree for the criterion to be met, and each one alone
 * proves nothing:
 *
 *   src/rulesets/cli/exit-code-taxonomy.rules.json   the authored rule
 *   src/rulesets/opa/cli-exit-code-taxonomy.rego     its Rego parity
 *   src/sdk/cli/scripts/exit-code-taxonomy-facts.mjs the facts it decides over
 *
 * `opa test` already exercises the policy against hand-written fact documents,
 * and `CliExitTaxonomyRuleHandler` already scans a tree. Neither answers the
 * question this spec asks: does a REAL out-of-taxonomy exit, in a REAL file on
 * disk, travel through the REAL producer and come out of the REAL policy as a
 * blocking violation? A hand-written fixture cannot answer that — it asserts
 * that the policy handles the input somebody imagined the producer emits.
 *
 * So each case below plants a scratch CLI tree, runs the committed producer over
 * it, and feeds the result to the committed `.rego` through the pinned OPA
 * binary. The `rogue command` case is the criterion stated literally.
 *
 * WHY A MISSING OPA IS RED, NOT SKIPPED. The binary is resolved through the
 * repository's own `ensureOpa`, which fetches and pins it — the same path every
 * OPA gate in CI takes. A spec that skipped itself when the runtime were absent
 * would be green on exactly the machine where nothing was verified, which is the
 * failure mode this board keeps finding.
 */
import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

const CLI_ROOT = path.resolve(__dirname, '..', '..', '..');
const REPO_ROOT = path.resolve(CLI_ROOT, '..', '..', '..');
const FACTS_SCRIPT = path.join(CLI_ROOT, 'scripts', 'exit-code-taxonomy-facts.mjs');
const POLICY = path.join(REPO_ROOT, 'src', 'rulesets', 'opa', 'cli-exit-code-taxonomy.rego');
const OPA_RUNTIME = path.join(REPO_ROOT, '.harness', 'scripts', 'opa-runtime.mjs');
const CLI_SRC = path.join(CLI_ROOT, 'src');

/** The published taxonomy, as the CLI's own `exit-codes.ts` declares it. */
const TAXONOMY_TS = [
  'export const CLI_EXIT_CODES = {',
  '  OK: 0,',
  '  TOOL_FAILURE: 1,',
  '  BLOCKED: 2,',
  '  INVALID_INPUT: 3,',
  '} as const;',
  '',
].join('\n');

// A possible one-off OPA download on a cold machine.
jest.setTimeout(300_000);

interface Violation {
  id: string;
  message: string;
}

/**
 * Resolve the pinned OPA binary through the repository's own runtime helper.
 *
 * Done in a subprocess because `opa-runtime.mjs` is ESM and this suite is
 * transpiled to CJS; shelling out keeps the helper as the single source of the
 * pinned version instead of hard-coding a path that would drift from it.
 */
function resolveOpaBinary(): string {
  const probe = spawnSync(
    process.execPath,
    [
      '--input-type=module',
      '-e',
      `import { ensureOpa } from ${JSON.stringify(OPA_RUNTIME)};` +
        `const opa = await ensureOpa(${JSON.stringify(REPO_ROOT)});` +
        `process.stdout.write(opa.binary);`,
    ],
    { encoding: 'utf8', cwd: REPO_ROOT },
  );
  if (probe.status !== 0) {
    throw new Error(`could not resolve the pinned OPA binary:\n${probe.stderr}`);
  }
  return probe.stdout.trim();
}

/** Run the committed fact producer over a source tree. */
function collectFacts(root: string): Record<string, unknown> {
  const probe = spawnSync(
    process.execPath,
    [
      '--input-type=module',
      '-e',
      `import { collectExitCodeFacts } from ${JSON.stringify(FACTS_SCRIPT)};` +
        `process.stdout.write(JSON.stringify(collectExitCodeFacts(${JSON.stringify(root)})));`,
    ],
    { encoding: 'utf8' },
  );
  if (probe.status !== 0) throw new Error(`fact producer failed:\n${probe.stderr}`);
  return JSON.parse(probe.stdout) as Record<string, unknown>;
}

/** Ask the committed policy for its verdict on those facts. */
function evaluatePolicy(opa: string, facts: Record<string, unknown>, workdir: string): Violation[] {
  const inputFile = path.join(workdir, 'input.json');
  fs.writeFileSync(inputFile, JSON.stringify({ core: { cli: { exitCodes: facts } } }));

  const run = spawnSync(
    opa,
    [
      'eval',
      '--format', 'json',
      '--data', POLICY,
      '--input', inputFile,
      'data.evolith.cli_exit_code_taxonomy.violations',
    ],
    { encoding: 'utf8' },
  );
  if (run.status !== 0) throw new Error(`opa refused the policy:\n${run.stderr}`);

  const parsed = JSON.parse(run.stdout) as {
    result?: Array<{ expressions?: Array<{ value?: Violation[] }> }>;
  };
  return parsed.result?.[0]?.expressions?.[0]?.value ?? [];
}

describe('GT-580 · the exit-code ruleset, from a real source tree to a Rego verdict', () => {
  let opa: string;
  let workdir: string;

  beforeAll(() => {
    opa = resolveOpaBinary();
    expect(fs.existsSync(POLICY)).toBe(true);
    expect(fs.existsSync(FACTS_SCRIPT)).toBe(true);
    workdir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'gt580-ruleset-')));
  });

  afterAll(() => {
    fs.rmSync(workdir, { recursive: true, force: true });
  });

  /** A scratch CLI tree with a declared taxonomy and whatever else is asked for. */
  function plant(name: string, sources: Record<string, string>): string {
    const root = path.join(workdir, name);
    const all = {
      'infrastructure/cli/exit-codes.ts': TAXONOMY_TS,
      ...sources,
    };
    for (const [rel, contents] of Object.entries(all)) {
      const full = path.join(root, rel);
      fs.mkdirSync(path.dirname(full), { recursive: true });
      fs.writeFileSync(full, contents);
    }
    return root;
  }

  it('clears the REAL CLI source tree, over a non-empty scan', () => {
    const facts = collectFacts(CLI_SRC);

    // The denominator first: a scan that read nothing also finds no offenders.
    expect(facts.scanned as number).toBeGreaterThan(80);
    expect(evaluatePolicy(opa, facts, workdir)).toEqual([]);
  });

  it('FAILS on a command that exits outside the taxonomy', () => {
    // The criterion, stated as an experiment: force an out-of-taxonomy exit in a
    // scratch fixture and require the ruleset to go red.
    const root = plant('rogue', {
      'commands/rogue/rogue.command.ts': 'export function boom(): void {\n  process.exit(7);\n}\n',
    });

    const violations = evaluatePolicy(opa, collectFacts(root), workdir);

    expect(violations.map((v) => v.id)).toEqual(['CLI-EXIT-01']);
    expect(violations[0].message).toContain('commands/rogue/rogue.command.ts');
    expect(violations[0].message).toContain('process.exit(7)');
  });

  it('FAILS on `process.exitCode = 64` as well — the other spelling', () => {
    const root = plant('rogue-assignment', {
      'commands/rogue/other.command.ts': 'process.exitCode = 64;\n',
    });

    const violations = evaluatePolicy(opa, collectFacts(root), workdir);
    expect(violations.map((v) => v.id)).toEqual(['CLI-EXIT-01']);
    expect(violations[0].message).toContain('process.exitCode = 64');
  });

  it('does NOT let the taxonomy be widened to silence the offender', () => {
    // The cheapest way to make the violation above disappear is to declare 7
    // legal. CLI-EXIT-03 is the rule that stops that from counting as a fix, so
    // the tree that tries it fails on BOTH counts.
    const root = plant('widened', {
      'commands/rogue/rogue.command.ts': 'process.exit(7);\n',
      'infrastructure/cli/exit-codes.ts': TAXONOMY_TS.replace('} as const;', '  ROGUE: 7,\n} as const;'),
    });

    const facts = collectFacts(root);
    // The producer reads the taxonomy from its own module, so the widening is
    // injected here to exercise the policy rule rather than the producer's
    // hard-coded mirror of the CLI constant.
    (facts as { declared: number[] }).declared = [0, 1, 2, 3, 7];

    const ids = evaluatePolicy(opa, facts, workdir).map((v) => v.id).sort();
    expect(ids).toEqual(['CLI-EXIT-01', 'CLI-EXIT-03']);
  });

  it('refuses a vacuous scan rather than reporting it as compliance', () => {
    const root = path.join(workdir, 'empty');
    fs.mkdirSync(root, { recursive: true });
    fs.writeFileSync(path.join(root, 'README.md'), '# no sources here');

    const facts = collectFacts(root);
    expect(facts.scanned).toBe(0);
    expect(evaluatePolicy(opa, facts, workdir).map((v) => v.id)).toEqual(['CLI-EXIT-02']);
  });
});
