/**
 * GT-580 — the published CLI exit-code taxonomy.
 *
 * Before this module the CLI had exactly two exit codes in practice: `0` and
 * `1`. A blocked governance verdict, an unreachable Core, a missing ruleset
 * corpus and a typo'd flag all collapsed onto `1`, so the single primitive an
 * agent harness, a pre-commit hook and a CI step have in common carried no
 * information. The one exception was the edit hook's `2`, which already meant
 * "blocked" — that meaning is preserved and generalised here.
 *
 *   0  PASS            the command ran and the verdict (if any) is favourable
 *   1  TOOL FAILURE    the command could not produce a verdict: I/O, network,
 *                      an unresolvable ruleset corpus, an unexpected crash
 *   2  BLOCKED         the command ran and the verdict BLOCKS: a failed gate,
 *                      a rejected evaluation, a vetoed edit
 *   3  INVALID INPUT   the invocation itself is wrong: an unknown action, a
 *                      missing required flag, a prompt required with no TTY
 *
 * The taxonomy is enforced two ways: `BaseEvolithCommand.handleError` maps a
 * thrown error onto it centrally, and `exit-code-taxonomy.spec.ts` fails the
 * build if any source file in the CLI exits with a literal outside it.
 */

/** The complete, closed set of exit codes the CLI is allowed to produce. */
export const CLI_EXIT_CODES = {
  /** The command ran and nothing blocks. */
  OK: 0,
  /** The command could not produce a verdict (infrastructure / unexpected). */
  TOOL_FAILURE: 1,
  /** The command ran and the governance verdict blocks. */
  BLOCKED: 2,
  /** The invocation is malformed: bad action, missing flag, prompt with no TTY. */
  INVALID_INPUT: 3,
} as const;

export type CliExitCode = (typeof CLI_EXIT_CODES)[keyof typeof CLI_EXIT_CODES];

/** Every value in the taxonomy, for guards and tests. */
export const CLI_EXIT_CODE_VALUES: readonly number[] = Object.freeze(
  Object.values(CLI_EXIT_CODES) as number[],
);

/** Human-readable name of a code, for `--help` text and diagnostics. */
export const CLI_EXIT_CODE_NAMES: Readonly<Record<CliExitCode, string>> = Object.freeze({
  [CLI_EXIT_CODES.OK]: 'pass',
  [CLI_EXIT_CODES.TOOL_FAILURE]: 'tool failure',
  [CLI_EXIT_CODES.BLOCKED]: 'blocked',
  [CLI_EXIT_CODES.INVALID_INPUT]: 'invalid input',
});

export function isCliExitCode(value: unknown): value is CliExitCode {
  return typeof value === 'number' && CLI_EXIT_CODE_VALUES.includes(value);
}

/**
 * An error that carries the exit code it must produce. Commands throw these
 * instead of calling `process.exit` so the mapping happens in exactly one
 * place (`BaseEvolithCommand.handleError`) and stays testable.
 */
export interface CliExitCodeCarrier {
  readonly cliExitCode: CliExitCode;
  /** ADR-0073 `ErrorCode` to put in the envelope, when one applies. */
  readonly envelopeErrorCode?: string;
}

export function carriesCliExitCode(error: unknown): error is Error & CliExitCodeCarrier {
  return (
    error instanceof Error &&
    isCliExitCode((error as Partial<CliExitCodeCarrier>).cliExitCode)
  );
}

/** The invocation is malformed — a bad action, a missing required flag. Exit 3. */
export class CliUsageError extends Error implements CliExitCodeCarrier {
  readonly cliExitCode = CLI_EXIT_CODES.INVALID_INPUT;
  readonly envelopeErrorCode = 'VALIDATION_FAILED';

  constructor(message: string) {
    super(message);
    this.name = 'CliUsageError';
  }
}

/**
 * A prompt was required on a stdin that is not a TTY.
 *
 * GT-611: this is an INPUT defect, not an infrastructure one — the caller
 * failed to supply, on the command line, a value the command needed. Exit 3
 * lets a CI step tell "you forgot `--name`" from "the Core is down".
 */
export class NonInteractiveError extends CliUsageError {
  constructor(
    /** Which prompt was refused, e.g. `select("Choose a runtime")`. */
    readonly promptDescription: string,
    hint?: string,
  ) {
    super(
      `This invocation cannot prompt: stdin is not a TTY and ${promptDescription} was required. ` +
        (hint ?? 'Supply the value with a flag, or run the command from an interactive terminal.'),
    );
    this.name = 'NonInteractiveError';
  }
}

/** The command ran and the governance verdict blocks. Exit 2. */
export class CliBlockedError extends Error implements CliExitCodeCarrier {
  readonly cliExitCode = CLI_EXIT_CODES.BLOCKED;
  readonly envelopeErrorCode = 'GATE_BLOCKED';

  constructor(message: string) {
    super(message);
    this.name = 'CliBlockedError';
  }
}

/**
 * Map an arbitrary thrown value onto the taxonomy.
 *
 * Anything that does not declare a code is a tool failure: an unexpected throw
 * is by definition "the command could not produce a verdict".
 */
export function resolveExitCode(error: unknown): CliExitCode {
  if (carriesCliExitCode(error)) return error.cliExitCode;
  // Matched by name so this module never has to import the infra error types
  // (and so a structurally-cloned error across a worker boundary still maps).
  if (error instanceof Error) {
    if (error.name === 'CliUsageError' || error.name === 'NonInteractiveError') {
      return CLI_EXIT_CODES.INVALID_INPUT;
    }
    if (error.name === 'CliBlockedError') return CLI_EXIT_CODES.BLOCKED;
  }
  return CLI_EXIT_CODES.TOOL_FAILURE;
}

/**
 * Map an ADR-0073 envelope `ErrorCode` onto the taxonomy.
 *
 * Several commands already funnel every failure through a local `fail(code,
 * message)` helper that then exited `1` regardless of `code` — the envelope
 * knew what kind of failure it was and the exit code threw the knowledge away.
 * This is the shared translation so all of them agree.
 */
export function exitCodeForErrorCode(code: string): CliExitCode {
  switch (code) {
    case 'VALIDATION_FAILED':
    case 'SCHEMA_INVALID':
    case 'INVALID_PHASE':
      return CLI_EXIT_CODES.INVALID_INPUT;
    case 'GATE_BLOCKED':
      return CLI_EXIT_CODES.BLOCKED;
    // RULESET_NOT_FOUND / NOT_A_SATELLITE / IO_ERROR / INTERNAL_ERROR: the
    // command could not reach a verdict — that is a tool failure, and it is
    // exactly the case an agent should RETRY rather than treat as a gate.
    default:
      return CLI_EXIT_CODES.TOOL_FAILURE;
  }
}

/**
 * Set the process exit code from the taxonomy.
 *
 * Preferred over `process.exit()`: it lets the command finish flushing and lets
 * Nest close its context, which `process.exit()` skips.
 */
export function setExitCode(code: CliExitCode): void {
  process.exitCode = code;
}

/**
 * Terminate now with a taxonomy code.
 *
 * Only for the paths that genuinely cannot return (a `catch` that must not fall
 * through). stdout/stderr are already forced blocking in `main.ts`, so nothing
 * is truncated.
 */
export function exitWith(code: CliExitCode): never {
  process.exit(code);
}
