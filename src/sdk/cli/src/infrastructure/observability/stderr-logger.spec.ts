import { StderrLogger } from './stderr-logger';

/**
 * GT-562 — `StderrLogger` exists for exactly one reason: `--format json` is an
 * ADR-0073 machine contract, and stdout must be a lone parseable envelope. Nest's
 * default logger writes `warn`/`log` to STDOUT, which prepends `[Nest] … WARN …`
 * lines to the envelope and makes `JSON.parse(stdout)` fail for every consumer.
 *
 * The file had zero coverage, so nothing stopped a diagnostic line from drifting
 * back onto stdout. These tests assert the stream, not just the text: a regression
 * here breaks every automated caller of the CLI while looking fine to a human.
 */
describe('StderrLogger', () => {
  let stderrSpy: jest.SpyInstance;
  let stdoutSpy: jest.SpyInstance;
  let logger: StderrLogger;

  /** Everything written to stderr, joined. */
  function stderr(): string {
    return stderrSpy.mock.calls.map((c) => String(c[0])).join('');
  }

  beforeEach(() => {
    logger = new StderrLogger();
    stderrSpy = jest.spyOn(process.stderr, 'write').mockReturnValue(true);
    stdoutSpy = jest.spyOn(process.stdout, 'write').mockReturnValue(true);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('writes warnings to stderr and never to stdout', () => {
    logger.warn('something looks off');

    expect(stderr()).toContain('WARN something looks off');
    expect(stdoutSpy).not.toHaveBeenCalled();
  });

  it('writes errors to stderr and never to stdout', () => {
    logger.error('it broke');

    expect(stderr()).toContain('ERROR it broke');
    expect(stdoutSpy).not.toHaveBeenCalled();
  });

  it.each(['log', 'debug', 'verbose'] as const)(
    'suppresses %s entirely, matching the prior [warn, error] filter',
    (level) => {
      logger[level]();

      expect(stderrSpy).not.toHaveBeenCalled();
      expect(stdoutSpy).not.toHaveBeenCalled();
    },
  );

  describe('context handling', () => {
    it('includes the context in brackets when one is supplied', () => {
      logger.warn('deprecated flag', 'ValidateCommand');

      expect(stderr()).toContain('[Nest] [ValidateCommand] WARN deprecated flag');
    });

    it('omits the bracketed context entirely when none is supplied', () => {
      logger.warn('no context here');

      expect(stderr()).toBe('[Nest] WARN no context here\n');
    });

    it('takes the LAST string argument as the context, which is how Nest calls error()', () => {
      // Nest calls error(message, stack?, context?) with varying arity.
      logger.error('failed', 'Error: failed\n    at somewhere', 'EnforceCommand');

      expect(stderr()).toContain('[EnforceCommand] ERROR failed');
    });
  });

  describe('message serialisation', () => {
    it('serialises a non-string message as JSON instead of printing [object Object]', () => {
      logger.warn({ rule: 'ADR-0073', count: 2 });

      expect(stderr()).toContain('WARN {"rule":"ADR-0073","count":2}');
    });

    it('terminates every line so consecutive entries do not run together', () => {
      logger.warn('first');
      logger.warn('second');

      expect(stderr()).toBe('[Nest] WARN first\n[Nest] WARN second\n');
    });
  });

  describe('stack traces', () => {
    it('emits a multi-line argument as a stack trace on its own stderr line', () => {
      logger.error('boom', 'Error: boom\n    at frame');

      expect(stderr()).toContain('Error: boom\n    at frame\n');
      expect(stdoutSpy).not.toHaveBeenCalled();
    });

    it('does not treat a single-line string argument as a stack trace', () => {
      logger.error('boom', 'SomeContext');

      // Only the formatted line — no bare echo of the context.
      expect(stderr()).toBe('[Nest] [SomeContext] ERROR boom\n');
    });

    it('ignores non-string trailing arguments rather than stringifying them as context', () => {
      logger.error('boom', { not: 'a string' });

      expect(stderr()).toBe('[Nest] ERROR boom\n');
    });
  });
});
