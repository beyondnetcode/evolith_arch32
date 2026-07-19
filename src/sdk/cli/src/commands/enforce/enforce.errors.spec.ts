import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { EnforceCommand } from './enforce.command';

/**
 * GT-562 — the FAILURE branches of `evolith enforce`.
 *
 * `enforce` is a gate: `compile` lowers a ruleset into native tool config and
 * `edit` blocks a disallowed edit at the point it is made. Its error paths all
 * flow through one `fail(code, message)` helper, and every distinct `code` was
 * uncovered. That matters more than usual because the CODE is the contract —
 * CLI, MCP and REST are supposed to classify the same failure the same way, and
 * a caller routes on it. A ruleset that cannot be READ collapsing into a generic
 * error is indistinguishable, to an automated caller, from a ruleset that
 * compiled to nothing.
 *
 * `process.exit` is stubbed to THROW, so each assertion also proves the command
 * stops at the failure instead of carrying on with unusable state.
 */

const EXIT = 'process.exit called';

describe('EnforceCommand — failure classification', () => {
  let dir: string;
  let command: EnforceCommand;
  let prompt: Record<string, jest.Mock>;
  let logSpy: jest.SpyInstance;
  let exitSpy: jest.SpyInstance;

  /** The ADR-0073 envelope the command wrote to stdout. */
  function envelope(): { error: { code: string; message: string } } {
    return JSON.parse(String(logSpy.mock.calls[0][0]));
  }

  /** Run a command expected to fail, and return the exit code it requested. */
  async function runExpectingExit(inputs: string[], options: Record<string, unknown>): Promise<number> {
    await expect(command.executeCommand(inputs, options)).rejects.toThrow(EXIT);
    return exitSpy.mock.calls[0][0] as number;
  }

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'enforce-errors-'));
    prompt = {
      showIntro: jest.fn(),
      showInfo: jest.fn(),
      showWarning: jest.fn(),
      showError: jest.fn(),
      showSuccess: jest.fn(),
      showOutro: jest.fn(),
    };
    command = new EnforceCommand(prompt as never);
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    exitSpy = jest.spyOn(process, 'exit').mockImplementation(((): never => {
      throw new Error(EXIT);
    }) as never);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    rmSync(dir, { recursive: true, force: true });
  });

  describe('action dispatch', () => {
    it('rejects an unknown action as VALIDATION_FAILED and names the supported ones', async () => {
      const code = await runExpectingExit(['run'], { format: 'json' });

      expect(code).toBe(1);
      expect(envelope().error.code).toBe('VALIDATION_FAILED');
      expect(envelope().error.message).toContain('compile, edit');
    });

    it('rejects a missing action rather than defaulting to compile', async () => {
      // Defaulting would run a compile the caller never asked for.
      await runExpectingExit([], { format: 'json' });

      expect(envelope().error.message).toContain("Unknown enforce action ''");
    });

    it('reports the failure on the human surface, not as JSON, when --format is not json', async () => {
      await runExpectingExit(['run'], {});

      expect(prompt['showError']).toHaveBeenCalledWith(expect.stringContaining('Unknown enforce action'));
      expect(logSpy).not.toHaveBeenCalled();
    });
  });

  describe('compile', () => {
    it('requires a ruleset to compile instead of compiling an empty set', async () => {
      // Compiling nothing would report "0 rules, all compiled" — a pass.
      await runExpectingExit(['compile'], { format: 'json' });

      expect(envelope().error.code).toBe('VALIDATION_FAILED');
      expect(envelope().error.message).toContain('--file <path> or --ruleset <id>');
    });

    it('classifies an unresolvable --ruleset id as RULESET_NOT_FOUND', async () => {
      await runExpectingExit(['compile'], {
        ruleset: 'no-such-ruleset',
        core: '/definitely/not/a/core',
        format: 'json',
      });

      expect(envelope().error.code).toBe('RULESET_NOT_FOUND');
    });

    it('classifies an unreadable ruleset file as IO_ERROR, naming the path it tried', async () => {
      const missing = join(dir, 'absent.rules.json');

      await runExpectingExit(['compile'], { file: missing, format: 'json' });

      expect(envelope().error.code).toBe('IO_ERROR');
      expect(envelope().error.message).toContain(missing);
    });

    it('classifies a malformed ruleset as IO_ERROR rather than compiling zero rules from it', async () => {
      const broken = join(dir, 'broken.rules.json');
      writeFileSync(broken, '{ "rules": [ ', 'utf-8');

      await runExpectingExit(['compile'], { file: broken, format: 'json' });

      expect(envelope().error.code).toBe('IO_ERROR');
    });

    it('compiles a ruleset whose `rules` key is absent as zero rules without crashing', async () => {
      // A well-formed file with no rules is legitimate; it must report an empty
      // compile, NOT an error — the distinction from the malformed case above is
      // the point.
      const empty = join(dir, 'empty.rules.json');
      writeFileSync(empty, JSON.stringify({ id: 'x' }), 'utf-8');

      await command.executeCommand(['compile'], { file: empty, format: 'json' });

      const parsed = JSON.parse(String(logSpy.mock.calls[0][0]));
      expect(parsed.data.summary.totalRules).toBe(0);
      expect(exitSpy).not.toHaveBeenCalled();
    });

    it('resolves a --ruleset that is already a .json path verbatim', async () => {
      const direct = join(dir, 'direct.rules.json');
      writeFileSync(direct, JSON.stringify({ rules: [] }), 'utf-8');

      await command.executeCommand(['compile'], { ruleset: direct, format: 'json' });

      const parsed = JSON.parse(String(logSpy.mock.calls[0][0]));
      expect(parsed.data.ruleset).toBe(direct);
      expect(exitSpy).not.toHaveBeenCalled();
    });
  });

  describe('edit gate', () => {
    const BOUNDARY_RULES = [
      {
        ruleId: 'HXA-01',
        adrRef: 'ADR-0002',
        appliesTo: 'src/domain/',
        forbiddenImports: ['src/infrastructure'],
        severity: 'error',
        message: 'Domain must not depend on Infrastructure (ADR-0002).',
      },
    ];

    function writeRules(): string {
      const p = join(dir, 'boundary-rules.json');
      writeFileSync(p, JSON.stringify(BOUNDARY_RULES), 'utf-8');
      return p;
    }

    it('requires --rules, because a gate with no contract would allow every edit', async () => {
      await runExpectingExit(['edit'], { format: 'json' });

      expect(envelope().error.code).toBe('VALIDATION_FAILED');
      expect(envelope().error.message).toContain('--rules <path>');
    });

    it('classifies a missing boundary-rules file as IO_ERROR', async () => {
      await runExpectingExit(['edit'], { rules: join(dir, 'nope.json'), format: 'json' });

      expect(envelope().error.code).toBe('IO_ERROR');
      expect(envelope().error.message).toContain('Failed to load boundary rules');
    });

    it('classifies a structurally invalid boundary contract as VALIDATION_FAILED, not IO_ERROR', async () => {
      // The distinction tells a caller whether to fix the FILE or fix its CONTENT.
      const bad = join(dir, 'bad-rules.json');
      writeFileSync(bad, JSON.stringify([{ ruleId: 'X' }]), 'utf-8');

      await runExpectingExit(['edit'], { rules: bad, format: 'json' });

      expect(envelope().error.code).toBe('VALIDATION_FAILED');
    });

    it('refuses an empty payload rather than treating "nothing to check" as allowed', async () => {
      await runExpectingExit(['edit'], { rules: writeRules(), payload: '   ', format: 'json' });

      expect(envelope().error.code).toBe('VALIDATION_FAILED');
      expect(envelope().error.message).toContain('Empty hook payload');
    });

    it('refuses a non-JSON payload instead of silently allowing the edit', async () => {
      await runExpectingExit(['edit'], { rules: writeRules(), payload: 'not json at all', format: 'json' });

      expect(envelope().error.code).toBe('VALIDATION_FAILED');
      expect(envelope().error.message).toContain('not valid JSON');
    });
  });
});
