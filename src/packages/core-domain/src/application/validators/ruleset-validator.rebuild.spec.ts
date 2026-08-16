/**
 * GT-676 — the rebuild seam, which has now dropped a collaborator twice.
 *
 * `GT-664` was `processRunner` lost in one of two hand-copied constructions, so
 * every `enforce:` rule silently degraded to the native engine on the CLI. The fix
 * there added the missing field. `GT-701` extracted the construction into one
 * place, and the extracted copy still enumerated fields by hand — so it carried 7
 * of the 10 declared options and dropped `topologyCatalog`,
 * `applyRuleApplicability` and `maxSkippedFraction`.
 *
 * These tests are about the SHAPE, not about any one field: a rebuild that
 * enumerates is a rebuild that will forget again, and the CLI sends an engine on
 * every `validate`, so this branch runs on every run.
 */

import { RulesetValidatorService } from './ruleset-validator.service';
import { rebuildValidatorForEngine } from './ruleset-validator.rebuild';
import type { RulesetValidatorOptions } from './ruleset-validator.types';

const fileSystem = () => ({
  exists: jest.fn().mockResolvedValue(false),
  readFile: jest.fn().mockResolvedValue(''),
}) as any;

const logger = () => ({
  log: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn(), verbose: jest.fn(),
}) as any;

function optionsWithEverySetting(): RulesetValidatorOptions {
  return {
    fileSystem: fileSystem(),
    logger: logger(),
    configParser: { parse: jest.fn().mockReturnValue({}) } as any,
    rulesetRepo: { loadAllRulesets: jest.fn().mockResolvedValue([]) } as any,
    engineType: 'native',
    topologyCatalog: { marker: 'catalog' } as any,
    processRunner: { marker: 'runner' } as any,
    metrics: { marker: 'metrics' } as any,
    maxSkippedFraction: 0.25,
    applyRuleApplicability: false,
  };
}

/** What the rebuilt instance was actually constructed from. */
const optionsOf = (validator: RulesetValidatorService) =>
  (validator as unknown as { options: RulesetValidatorOptions }).options;

describe('rebuildValidatorForEngine · GT-676', () => {
  it('carries EVERY declared option, not a hand-written subset', () => {
    // The assertion that would have caught both GT-664 and its repeat: compare
    // the key sets, so an option added tomorrow is covered without editing this
    // test. Naming the three that were dropped would only re-pin today's list.
    const options = optionsWithEverySetting();
    const rebuilt = rebuildValidatorForEngine(new RulesetValidatorService(options), 'opa');

    const carried = optionsOf(rebuilt);
    expect(Object.keys(carried).sort()).toEqual(Object.keys(options).sort());
    for (const key of Object.keys(options) as (keyof RulesetValidatorOptions)[]) {
      if (key === 'engineType') continue;
      expect(carried[key]).toBe(options[key]);
    }
    expect(carried.engineType).toBe('opa');
  });

  it('applies a per-call coverage floor without touching the engine', () => {
    // The GT-676 case: a caller asks only for a floor. Switching engines as a
    // side effect would be the GT-688 defect in mirror image.
    const options = optionsWithEverySetting();
    const rebuilt = rebuildValidatorForEngine(
      new RulesetValidatorService(options),
      undefined,
      { maxSkippedFraction: 0.1 },
    );

    expect(optionsOf(rebuilt).maxSkippedFraction).toBe(0.1);
    expect(optionsOf(rebuilt).engineType).toBe('native');
  });

  it('an absent override does NOT erase a configured floor', () => {
    // `{...options, maxSkippedFraction: undefined}` would silently disable the
    // gate on every call that did not mention one — a weakening nobody would see.
    const options = optionsWithEverySetting();
    const rebuilt = rebuildValidatorForEngine(
      new RulesetValidatorService(options),
      'opa',
      { maxSkippedFraction: undefined },
    );

    expect(optionsOf(rebuilt).maxSkippedFraction).toBe(0.25);
  });

  it('returns a stub validator untouched instead of throwing', () => {
    // Several suites inject partial doubles. A real service cannot exist without
    // the four required collaborators — the constructor throws — so "no options"
    // means "not a RulesetValidatorService", and rebuilding one is meaningless.
    const stub = { validate: jest.fn() } as unknown as RulesetValidatorService;
    expect(rebuildValidatorForEngine(stub, 'opa')).toBe(stub);
  });
});
