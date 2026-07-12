/**
 * GT-456: unified Core resolution for every command that consumes the Evolith
 * Core (validate / evaluate / gate / phase / sdlc gate-status).
 *
 * The *override* chain answers "where did the operator say the Core lives?":
 *
 *   1. an explicit `--core <path>` flag,
 *   2. the `EVOLITH_CORE_PATH` environment variable,
 *   3. the active profile's `core` entry.
 *
 * When none of those are set the function returns `undefined`, which the caller
 * then feeds to its own auto-detect step — `resolveRulesets()` (rulesets root)
 * for validate/evaluate, or `PhaseGateValidatorService.findCorePath()` (Core
 * repo root) for the gate/phase machinery. Keeping the override chain in ONE
 * place is what makes `--core`, `EVOLITH_CORE_PATH` and `profile.core` behave
 * identically across surfaces instead of each command wiring its own subset
 * (the drift GT-456 set out to remove).
 */
export interface CoreOverrideInput {
  /** Value of an explicit `--core` flag, if provided. */
  explicit?: string;
  /** The active profile's `core` entry (`profile.core`), if configured. */
  profileCore?: string;
}

/**
 * Resolve the Core override string from the unified chain
 * (`--core` → `EVOLITH_CORE_PATH` → `profile.core`).
 *
 * @returns the first non-empty candidate, or `undefined` when the operator gave
 *          no override and the caller should auto-detect.
 */
export function resolveCoreOverride({ explicit, profileCore }: CoreOverrideInput): string | undefined {
  const candidate = explicit || process.env.EVOLITH_CORE_PATH || profileCore;
  return candidate && candidate.trim().length > 0 ? candidate : undefined;
}
