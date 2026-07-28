/**
 * GT-580 criterion 3 (partial) — the FACT PRODUCER a governance rule needs.
 *
 * The criterion asks for a ruleset with Rego parity that fails a command exiting
 * outside the taxonomy. The ruleset itself lives under `src/rulesets/**`, which
 * this change does not own; what it can own is the half without which the rule
 * could assert nothing — a fact document about the CLI's exit codes, produced
 * outside jest so the ruleset engine and CI can both consume it.
 *
 * The negative fixture is the point. This board has repeatedly caught guards
 * nobody had ever seen fail, so the producer is pointed at a tree containing a
 * deliberate `process.exit(7)` and must report it.
 */
import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

const CLI_ROOT = path.resolve(__dirname, '..', '..', '..');
const SCRIPT = path.join(CLI_ROOT, 'scripts', 'exit-code-taxonomy-facts.mjs');

jest.setTimeout(60_000);

describe('GT-580 · exit-code taxonomy facts', () => {
  it('reports this package as compliant over a non-empty scan', () => {
    const run = spawnSync(process.execPath, [SCRIPT, '--json'], { encoding: 'utf8' });

    const facts = JSON.parse(run.stdout);
    expect(facts.declared).toEqual([0, 1, 2, 3]);
    // A scan that found nothing also finds no offenders; that is not compliance.
    expect(facts.scanned).toBeGreaterThan(80);
    expect(facts.offenders).toEqual([]);
    expect(facts.compliant).toBe(true);
    expect(run.status).toBe(0);
  });

  it('turns red on a source that exits outside the taxonomy', () => {
    const tmp = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'gt580-facts-')));
    try {
      fs.writeFileSync(
        path.join(tmp, 'rogue.command.ts'),
        'export function boom(): void {\n  process.exit(7);\n}\n',
      );
      // A `.spec.ts` neighbour must NOT count — tests legitimately stub exits.
      fs.writeFileSync(path.join(tmp, 'rogue.spec.ts'), 'process.exit(9);\n');

      const probe = spawnSync(
        process.execPath,
        [
          '--input-type=module',
          '-e',
          `import { collectExitCodeFacts } from ${JSON.stringify(SCRIPT)};` +
            `process.stdout.write(JSON.stringify(collectExitCodeFacts(${JSON.stringify(tmp)})));`,
        ],
        { encoding: 'utf8' },
      );

      const facts = JSON.parse(probe.stdout);
      expect(facts.compliant).toBe(false);
      expect(facts.offenders).toEqual([
        { file: 'rogue.command.ts', code: 7, snippet: 'process.exit(7)' },
      ]);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });
});
