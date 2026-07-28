import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import {
  CLI_EXIT_CODES,
  CLI_EXIT_CODE_VALUES,
  CliBlockedError,
  CliUsageError,
  NonInteractiveError,
  carriesCliExitCode,
  exitCodeForErrorCode,
  isCliExitCode,
  resolveExitCode,
  setExitCode,
} from './exit-codes';

/**
 * GT-580 — the exit code is the only control primitive an agent harness, a
 * pre-commit hook and a CI step have in common, and the CLI used to answer
 * every question with `1`: a blocked verdict, an unreachable Core, a missing
 * ruleset corpus and a typo'd flag were indistinguishable.
 *
 * Two things are asserted here:
 *   1. the taxonomy's semantics (what maps to what), and
 *   2. that no source file in the CLI exits outside it — the part that stops a
 *      NEW command from quietly reintroducing the collapse.
 */

const SRC_ROOT = join(__dirname, '..', '..');

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === 'node_modules' || entry === '__mocks__') continue;
      out.push(...sourceFiles(full));
      continue;
    }
    if (!entry.endsWith('.ts')) continue;
    if (entry.endsWith('.spec.ts') || entry.endsWith('.test.ts')) continue;
    out.push(full);
  }
  return out;
}

describe('GT-580 · CLI exit-code taxonomy', () => {
  describe('semantics', () => {
    it('publishes exactly four codes and keeps 2 meaning what it already meant', () => {
      expect(CLI_EXIT_CODES).toEqual({ OK: 0, TOOL_FAILURE: 1, BLOCKED: 2, INVALID_INPUT: 3 });
      // The edit hook has always used 2 for "this edit is vetoed". Generalising
      // 2 to "blocked" preserves that consumer instead of renumbering it.
      expect(CLI_EXIT_CODES.BLOCKED).toBe(2);
    });

    it.each([
      ['a usage error is invalid input', new CliUsageError('--ref is required'), CLI_EXIT_CODES.INVALID_INPUT],
      ['a refused prompt is invalid input', new NonInteractiveError('a confirmation'), CLI_EXIT_CODES.INVALID_INPUT],
      ['a blocking verdict is blocked', new CliBlockedError('gate failed'), CLI_EXIT_CODES.BLOCKED],
      ['an unexpected throw is a tool failure', new Error('ECONNREFUSED'), CLI_EXIT_CODES.TOOL_FAILURE],
      ['a non-Error throw is a tool failure', 'boom', CLI_EXIT_CODES.TOOL_FAILURE],
    ])('%s', (_label, error, expected) => {
      expect(resolveExitCode(error)).toBe(expected);
    });

    it('separates a blocked verdict from an unreachable Core — the whole point of the gap', () => {
      const blocked = resolveExitCode(new CliBlockedError('architecture gate failed'));
      const unreachable = resolveExitCode(new Error('connect ECONNREFUSED 127.0.0.1:3000'));

      expect(blocked).not.toBe(unreachable);
      expect([blocked, unreachable]).toEqual([CLI_EXIT_CODES.BLOCKED, CLI_EXIT_CODES.TOOL_FAILURE]);
    });

    it.each([
      ['VALIDATION_FAILED', CLI_EXIT_CODES.INVALID_INPUT],
      ['SCHEMA_INVALID', CLI_EXIT_CODES.INVALID_INPUT],
      ['INVALID_PHASE', CLI_EXIT_CODES.INVALID_INPUT],
      ['GATE_BLOCKED', CLI_EXIT_CODES.BLOCKED],
      ['RULESET_NOT_FOUND', CLI_EXIT_CODES.TOOL_FAILURE],
      ['NOT_A_SATELLITE', CLI_EXIT_CODES.TOOL_FAILURE],
      ['IO_ERROR', CLI_EXIT_CODES.TOOL_FAILURE],
      ['INTERNAL_ERROR', CLI_EXIT_CODES.TOOL_FAILURE],
    ])('maps envelope code %s onto the taxonomy', (code, expected) => {
      // The envelope already knew what kind of failure it was; the `fail()`
      // helpers in gate/phase/enforce threw that knowledge away and exited 1.
      expect(exitCodeForErrorCode(code)).toBe(expected);
    });

    it('recognises only taxonomy members', () => {
      expect(CLI_EXIT_CODE_VALUES).toEqual([0, 1, 2, 3]);
      expect(isCliExitCode(3)).toBe(true);
      expect(isCliExitCode(4)).toBe(false);
      expect(isCliExitCode('1')).toBe(false);
    });

    it('detects a carrier error and its envelope code', () => {
      const err = new CliUsageError('bad flag');
      expect(carriesCliExitCode(err)).toBe(true);
      expect(err.envelopeErrorCode).toBe('VALIDATION_FAILED');
      expect(carriesCliExitCode(new Error('plain'))).toBe(false);
    });

    it('sets process.exitCode without terminating the process', () => {
      setExitCode(CLI_EXIT_CODES.BLOCKED);
      expect(process.exitCode).toBe(2);
      process.exitCode = 0;
    });
  });

  describe('no source file exits outside the taxonomy', () => {
    const files = sourceFiles(SRC_ROOT);
    // `process.exit(1)` / `process.exitCode = 1` with a numeric literal.
    const EXIT_LITERAL = /process\.exit\(\s*(-?\d+)\s*\)|process\.exitCode\s*=\s*(-?\d+)/g;

    it('scans a non-empty set of sources (a green from an empty scan is not a green)', () => {
      expect(files.length).toBeGreaterThan(80);
      expect(files.some((f) => f.endsWith('validate.command.ts'))).toBe(true);
    });

    it('uses only 0, 1, 2 or 3 anywhere it names an exit code', () => {
      const offenders: string[] = [];
      for (const file of files) {
        const source = readFileSync(file, 'utf8');
        for (const match of source.matchAll(EXIT_LITERAL)) {
          const literal = Number(match[1] ?? match[2]);
          if (!isCliExitCode(literal)) {
            offenders.push(`${relative(SRC_ROOT, file)}: ${match[0]}`);
          }
        }
      }
      expect(offenders).toEqual([]);
    });

    it('keeps the verdict commands out of the collapsed `exit 1` for a blocking verdict', () => {
      // These four are the commands that PRODUCE a verdict. If any of them
      // signals a blocking verdict with 1 again, an agent cannot tell "your
      // architecture failed the gate" from "the tool broke" — which is the
      // difference between a blocked merge and a retry.
      const verdictSites: Array<[string, RegExp]> = [
        ['commands/validate/validate.command.ts', /result\.status === 'failed'\) exitWith\(CLI_EXIT_CODES\.BLOCKED\)/],
        ['commands/gate/gate.command.ts', /evidence\.verdict === 'failed'[\s\S]{0,60}exitWith\(CLI_EXIT_CODES\.BLOCKED\)/],
        ['commands/evaluate/evaluate.command.ts', /overallVerdict === 'FAIL'[\s\S]{0,90}exitWith\(CLI_EXIT_CODES\.BLOCKED\)/],
        ['commands/phase/phase-advance.command.ts', /!proposal\.isRecommended[\s\S]{0,90}exitWith\(CLI_EXIT_CODES\.BLOCKED\)/],
      ];

      for (const [rel, pattern] of verdictSites) {
        const source = readFileSync(join(SRC_ROOT, rel), 'utf8');
        expect({ file: rel, matches: pattern.test(source) }).toEqual({ file: rel, matches: true });
      }
    });
  });
});
