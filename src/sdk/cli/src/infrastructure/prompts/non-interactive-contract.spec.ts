import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import * as clack from '@clack/prompts';
import { PromptService } from './prompt.service';
import { FORCE_INTERACTIVE_ENV, NON_INTERACTIVE_ENV, isInteractiveSession } from './interactivity';
import { CLI_EXIT_CODES, NonInteractiveError, resolveExitCode } from '../cli/exit-codes';

/**
 * GT-611 — the surface-wide assertion.
 *
 * GT-571 gave `init` a non-interactive contract and left `validate`, `upgrade`,
 * `phase-advance`, `adr`, `waiver`, `chat`, `enforce`, `agents` and the rest as
 * they were, because the contract was enforced per command. This suite asserts
 * the property at the level where it is actually true or false:
 *
 *   1. `PromptService` — the ONE prompt channel — refuses every interactive
 *      method when stdin is not a TTY, before any escape sequence is written.
 *   2. No command file opens a second channel (a direct `@clack/prompts`,
 *      `readline`, `inquirer` or `process.stdin` read), so (1) covers every
 *      registered command, including ones written after this test.
 *
 * (2) is what makes this a SURFACE-wide test rather than a service test: the
 * defect class is "a new command prompts its own way", and a behavioural test
 * per command could never cover a command that does not exist yet.
 */

const SRC_ROOT = join(__dirname, '..', '..');
const COMMANDS_ROOT = join(SRC_ROOT, 'commands');

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...sourceFiles(full));
      continue;
    }
    if (!entry.endsWith('.ts')) continue;
    if (entry.endsWith('.spec.ts') || entry.endsWith('.test.ts')) continue;
    out.push(full);
  }
  return out;
}

describe('GT-611 · non-interactive contract', () => {
  const originalTTY = process.stdin.isTTY;
  const originalForce = process.env[FORCE_INTERACTIVE_ENV];
  const originalNon = process.env[NON_INTERACTIVE_ENV];

  function setStdinTTY(value: boolean | undefined): void {
    Object.defineProperty(process.stdin, 'isTTY', { value, configurable: true });
  }

  beforeEach(() => {
    delete process.env[FORCE_INTERACTIVE_ENV];
    delete process.env[NON_INTERACTIVE_ENV];
    setStdinTTY(false);
    jest.clearAllMocks();
  });

  afterAll(() => {
    setStdinTTY(originalTTY);
    if (originalForce === undefined) delete process.env[FORCE_INTERACTIVE_ENV];
    else process.env[FORCE_INTERACTIVE_ENV] = originalForce;
    if (originalNon === undefined) delete process.env[NON_INTERACTIVE_ENV];
    else process.env[NON_INTERACTIVE_ENV] = originalNon;
  });

  describe('the prompt boundary itself', () => {
    // Every interactive entry point on the service, with a minimal argument set.
    const interactiveCalls: Array<[string, (s: PromptService) => Promise<unknown>]> = [
      ['confirm', (s) => s.confirm('Apply 3 change(s)?')],
      ['text', (s) => s.text({ message: 'ID del ADR:' })],
      ['select', (s) => s.select({ message: 'Pick', options: [{ value: 'a' }] })],
      ['multiselect', (s) => s.multiselect({ message: 'Pick many', options: [{ value: 'a' }] })],
      ['askInitOptions', (s) => s.askInitOptions({} as never)],
    ];

    it.each(interactiveCalls)(
      'refuses %s on a stdin that is not a TTY instead of painting a menu into the pipe',
      async (_name, invoke) => {
        await expect(invoke(new PromptService())).rejects.toBeInstanceOf(NonInteractiveError);
      },
    );

    it.each(interactiveCalls)(
      'never reaches @clack/prompts for %s, so nothing is written to stdout',
      async (_name, invoke) => {
        await invoke(new PromptService()).catch(() => undefined);

        expect(clack.confirm).not.toHaveBeenCalled();
        expect(clack.text).not.toHaveBeenCalled();
        expect(clack.select).not.toHaveBeenCalled();
        expect(clack.multiselect).not.toHaveBeenCalled();
        expect(clack.group).not.toHaveBeenCalled();
      },
    );

    it('classifies the refusal as invalid input (exit 3), not as a tool failure', async () => {
      const error = await new PromptService().confirm('Apply?').catch((e) => e);

      // The whole point: a CI step can tell "you forgot a flag" from "the Core
      // is unreachable". Collapsing both onto 1 is the defect GT-580 names.
      expect(resolveExitCode(error)).toBe(CLI_EXIT_CODES.INVALID_INPUT);
      expect(error.message).toMatch(/stdin is not a TTY/);
    });

    it('still prompts when a TTY is present, so the interactive product is unchanged', async () => {
      setStdinTTY(true);
      (clack.confirm as jest.Mock).mockResolvedValue(true);
      (clack.isCancel as unknown as jest.Mock).mockReturnValue(false);

      await expect(new PromptService().confirm('Apply?')).resolves.toBe(true);
      expect(clack.confirm).toHaveBeenCalled();
    });

    it.each([
      ['EVOLITH_NON_INTERACTIVE wins over a real TTY', true, { [NON_INTERACTIVE_ENV]: '1' }, false],
      ['EVOLITH_FORCE_INTERACTIVE wins over a missing TTY', false, { [FORCE_INTERACTIVE_ENV]: '1' }, true],
      ['a falsy override is ignored', false, { [FORCE_INTERACTIVE_ENV]: '0' }, false],
      ['an empty override is ignored', true, { [NON_INTERACTIVE_ENV]: '' }, true],
    ])('%s', (_label, tty, env, expected) => {
      setStdinTTY(tty);
      Object.assign(process.env, env);
      expect(isInteractiveSession()).toBe(expected);
    });
  });

  describe('the surface: no command opens a second prompt channel', () => {
    const files = sourceFiles(COMMANDS_ROOT);

    it('finds the command sources to scan (guards against a silently empty scan)', () => {
      // A path refactor that made this list empty would turn the assertions
      // below into a vacuous green — the exact failure mode this backlog keeps
      // hitting. Assert the scan actually saw the surface.
      expect(files.length).toBeGreaterThan(30);
      expect(files.some((f) => f.endsWith('waiver.command.ts'))).toBe(true);
      expect(files.some((f) => f.endsWith('chat.command.ts'))).toBe(true);
    });

    it('routes every prompt through PromptService — no direct prompt library in any command', () => {
      const offenders = files
        .filter((file) => {
          const source = readFileSync(file, 'utf8');
          return (
            /from ['"]@clack\/prompts['"]/.test(source) ||
            /from ['"]inquirer['"]/.test(source) ||
            /from ['"]prompts['"]/.test(source) ||
            /from ['"]node:readline/.test(source) ||
            /require\(['"]readline['"]\)/.test(source)
          );
        })
        .map((f) => relative(SRC_ROOT, f));

      // `profile.command.ts` used to be here: it imported @clack/prompts and
      // prompted four times regardless of TTY, so `profile create --format json`
      // wrote ANSI into a pipe that expected an envelope.
      expect(offenders).toEqual([]);
    });

    it('reads stdin only through the vetted edit-hook payload reader', () => {
      const offenders = files
        .filter((file) => /process\.stdin\.(on|read|setRawMode|resume)\b/.test(readFileSync(file, 'utf8')))
        .map((f) => relative(SRC_ROOT, f));

      // `enforce edit` consumes a hook payload from stdin on purpose; it does so
      // via `readStdin` in the edit-hook service, never inline in a command.
      expect(offenders).toEqual([]);
    });
  });
});
