import { NonInteractiveError } from '../cli/exit-codes';

/**
 * GT-611 — the machine contract for interactive prompts, enforced at ONE
 * boundary instead of per command.
 *
 * GT-571 gave `init` a non-interactive contract and left the other consumers of
 * `PromptService` (`validate`, `upgrade`, `phase-advance`, `adr`, `waiver`,
 * `chat`, `enforce`, `agents`, …) as they were: a CI step that piped any of them
 * into `jq` still received an ANSI menu and read exit 0. Guarding each command
 * is how that happened, so the guard lives here and every prompt path goes
 * through it.
 *
 * Precedence:
 *   1. `EVOLITH_FORCE_INTERACTIVE` truthy → interactive (escape hatch for
 *      terminals that misreport `isTTY`, and for the tests that drive the
 *      interactive branches deliberately).
 *   2. `EVOLITH_NON_INTERACTIVE` truthy → never interactive.
 *   3. `process.stdin.isTTY` — the actual question: is there a human to answer?
 *
 * Note it is *stdin* and not stdout: `evolith adr | tee log` still has a human
 * at the keyboard, while `echo | evolith adr` does not.
 */

export const FORCE_INTERACTIVE_ENV = 'EVOLITH_FORCE_INTERACTIVE';
export const NON_INTERACTIVE_ENV = 'EVOLITH_NON_INTERACTIVE';

function isTruthy(value: string | undefined): boolean {
  if (value === undefined) return false;
  const normalised = value.trim().toLowerCase();
  return normalised !== '' && normalised !== '0' && normalised !== 'false';
}

/** True when a prompt has a human who can answer it. */
export function isInteractiveSession(): boolean {
  if (isTruthy(process.env[FORCE_INTERACTIVE_ENV])) return true;
  if (isTruthy(process.env[NON_INTERACTIVE_ENV])) return false;
  return Boolean(process.stdin.isTTY);
}

/**
 * Refuse a prompt that has nobody to answer it.
 *
 * Throws {@link NonInteractiveError} (exit code 3, invalid input) BEFORE any
 * escape sequence reaches stdout, so a `--format json` consumer never sees a
 * half-rendered menu where an envelope should be.
 */
export function assertInteractive(promptDescription: string, hint?: string): void {
  if (isInteractiveSession()) return;
  throw new NonInteractiveError(promptDescription, hint);
}
