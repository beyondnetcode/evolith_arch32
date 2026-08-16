import { RulesetValidatorService } from './ruleset-validator.service';
import type { RulesetValidatorOptions } from './ruleset-validator.types';

/**
 * GT-701 — rebuild a validator for a different engine, carrying every collaborator.
 *
 * This existed twice inside `ValidateSatelliteUseCase` (the `execute` branch and
 * `buildValidator`) before three more call sites needed it — the CLI, MCP and REST
 * composable surfaces, which accepted `engine` and evaluated nothing. Copying it a
 * third, fourth and fifth time is how GT-664 happened: that defect was ONE of the
 * two copies dropping `processRunner`, so every `enforce:` rule silently degraded
 * to the native engine on the surface that used it, while the other copy was fine.
 *
 * GT-676 — and then the extracted copy dropped three of its own.
 *
 * Enumerating fields by hand only moved the defect: measured on 2026-08-16, this
 * function carried 7 of the 10 declared options and silently lost
 * `topologyCatalog`, `applyRuleApplicability` and `maxSkippedFraction`. The last
 * one is the coverage floor, so a caller could ask for "fail if more than 20% of
 * the rules did not run", have the flag accepted, and get a verdict computed
 * without it — the CLI sends an engine on EVERY `validate`, so this branch runs
 * every time.
 *
 * The service now retains the options object it was built from, so the rebuild
 * spreads it and **cannot under-fill**. A new option is carried by construction,
 * which is the difference between fixing this defect and fixing this instance of
 * it: GT-664 added the missing field and left the next one to be forgotten.
 */
export function rebuildValidatorForEngine(
  validator: RulesetValidatorService,
  engine?: 'native' | 'opa',
  /**
   * GT-676 — per-call options a caller supplied that the instance was not built
   * with, the coverage floor being the first. Keys whose value is `undefined` are
   * DROPPED rather than spread: `{...options, maxSkippedFraction: undefined}`
   * would erase a configured floor whenever a caller did not mention one, which
   * is a silent weakening of a gate and exactly the class of bug this file exists
   * to stop.
   */
  overrides?: Partial<RulesetValidatorOptions>,
): RulesetValidatorService {
  const source = validator as unknown as { options?: RulesetValidatorOptions };

  // A REAL validator always has them: the constructor throws without `fileSystem`,
  // `logger`, `configParser` and `rulesetRepo`, and stores the object it validated.
  // So "no options" means "not a RulesetValidatorService" — a stub or a partial
  // double, which several suites inject deliberately. Rebuilding one of those
  // produces nothing useful, and throwing would take the surface down for a host
  // that was never going to run an engine anyway.
  //
  // This is NOT the silent downgrade GT-688 was about: that was a real validator
  // rebuilt for the wrong engine and answering as if it were the right one. Here
  // there is no engine to downgrade from.
  if (!source.options?.fileSystem) {
    return validator;
  }

  const defined = Object.fromEntries(
    Object.entries(overrides ?? {}).filter(([, value]) => value !== undefined),
  ) as Partial<RulesetValidatorOptions>;

  return new RulesetValidatorService({
    ...source.options,
    // Absent engine ⇒ keep the instance's own, so asking only for a coverage floor
    // cannot silently switch engines — the mirror of the GT-688 defect.
    ...(engine ? { engineType: engine } : {}),
    ...defined,
  });
}
