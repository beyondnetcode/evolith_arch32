import { RulesetValidatorService } from './ruleset-validator.service';

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
 * Reaching through `as any` is not an accident to be tidied away later. The
 * collaborators are private and there is no accessor; exposing five getters to
 * serve one rebuild would widen the service's public surface for every consumer.
 * The cost of the cast is paid once, here, where it can be read and tested,
 * instead of at five call sites where a missing field is invisible.
 */
export function rebuildValidatorForEngine(
  validator: RulesetValidatorService,
  engine: 'native' | 'opa',
): RulesetValidatorService {
  const source = validator as unknown as {
    fs?: unknown;
    logger?: unknown;
    configParser?: unknown;
    engine?: { rulesetRepo?: unknown };
    processRunner?: unknown;
    metrics?: unknown;
  };

  // A REAL validator cannot exist without these: the constructor throws on each
  // one. So "no collaborators" means "not a RulesetValidatorService" — a stub or
  // a partial double, which several suites inject deliberately. Rebuilding one of
  // those produces nothing useful, and throwing would take the surface down for a
  // host that was never going to run an engine anyway.
  //
  // This is NOT the silent downgrade GT-688 was about: that was a real validator
  // being rebuilt for the wrong engine and answering as if it were the right one.
  // Here there is no engine to downgrade from, and the invariant that makes the
  // check safe is enforced by the constructor three lines from this file.
  if (!source.fs || !source.logger || !source.configParser) {
    return validator;
  }

  return new RulesetValidatorService({
    engineType: engine,
    fileSystem: source.fs,
    logger: source.logger,
    configParser: source.configParser,
    rulesetRepo: source.engine?.rulesetRepo,
    // GT-664 — the enforcer subsystem has to survive the rebuild. A validator
    // rebuilt without `processRunner` never builds the composite enforcer
    // strategy, so every `enforce:` rule falls back to the native engine and the
    // run still looks legitimate.
    processRunner: source.processRunner,
    metrics: source.metrics,
  } as never);
}
