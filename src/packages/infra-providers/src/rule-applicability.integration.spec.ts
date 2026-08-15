/**
 * GT-571 — a freshly initialized satellite must not be judged by rules addressed
 * to somebody else.
 *
 * Nothing is mocked, because the defect was not in a mock: the first
 * `evolith validate` of a brand-new repository returned 35 blocking findings and
 * every one was addressed to somebody else — CLI-RR-* and TAX-* speak to the
 * vendor's own monorepo, and rules from eight mutually exclusive topologies all
 * fired at once on a repo that declares none of them.
 *
 * The headline used to read "must return ZERO blocking findings". GT-595 AC2
 * makes `blocking` + `skipped` fail the run, so a fresh satellite now legitimately
 * reports blocking findings that have nothing to do with applicability — the
 * corpus's own unrunnable blocking rules. The invariant this suite defends is
 * therefore stated as what it always meant: nothing excluded by applicability may
 * fire, and every blocking finding must be accounted for by name. See the first
 * two tests.
 *
 * This lives in infra-providers, not core-domain: it needs the real disk adapters,
 * and infra-providers is the side of the boundary allowed to depend on the domain.
 * Every assertion below fails against the pre-GT-571 code.
 */

import * as nodeFs from 'fs';
import * as os from 'os';
import * as path from 'path';

import {
  RuleApplicabilityIndex,
  RulesetValidatorService,
  partitionByApplicability,
} from '@beyondnet/evolith-core-domain/application/validators';
import type { ApplicabilityContext } from '@beyondnet/evolith-core-domain/application/validators';
import { InitializeProjectUseCase } from '@beyondnet/evolith-core-domain/application/use-cases';
import type { NormalizedRule } from '@beyondnet/evolith-core-domain/domain/models/normalized-rule';

import { DiskRulesetRepository } from './disk-ruleset.repository';
import { NodeFileSystemProvider } from './node-filesystem.provider';
import { YamlConfigParserImpl } from './config-parser.provider';

/** The Evolith Core monorepo root — the corpus under test lives at `src/rulesets`. */
const CORE = path.resolve(__dirname, '../../../..');

const silentLogger = {
  info: () => undefined, warn: () => undefined, error: () => undefined,
  debug: () => undefined, success: () => undefined,
} as any;

const catalogStub = {
  loadRuntimeCatalog: () => [{ id: 'typescript' }],
  getMonorepoOptions: () => [{ id: 'nx' }],
  getArchitecturePatterns: () => [{ id: 'clean' }],
} as any;

function validatorFor(overrides: Record<string, unknown> = {}): RulesetValidatorService {
  const fs = new NodeFileSystemProvider() as any;
  return new RulesetValidatorService({
    fileSystem: fs,
    logger: silentLogger,
    configParser: new YamlConfigParserImpl() as any,
    rulesetRepo: new DiskRulesetRepository(fs, silentLogger) as any,
    ...overrides,
  });
}

/** Runs the real init use case and returns the scaffolded satellite root. */
async function freshlyInitializedSatellite(): Promise<string> {
  const cwd = nodeFs.mkdtempSync(path.join(os.tmpdir(), 'gt571-'));
  const useCase = new InitializeProjectUseCase(new NodeFileSystemProvider() as any, catalogStub);
  const result = await useCase.execute(
    {
      name: 'my-sat',
      runtime: 'typescript',
      monorepo: 'nx',
      architecture: 'clean',
      database: 'postgres',
      apiProtocol: 'rest',
      ciCd: 'github-actions',
      observability: 'otel',
      features: ['adr', 'hooks', 'acl'],
      agents: [],
    },
    cwd,
  );
  expect(result.success).toBe(true);
  return path.join(cwd, 'my-sat');
}

jest.setTimeout(120_000);

describe('GT-571 · the first validate of a freshly initialized satellite', () => {
  let satellitePath: string;

  beforeAll(async () => {
    satellitePath = await freshlyInitializedSatellite();
  });

  /**
   * GT-595 AC2 changed what "zero blocking findings" can mean, so this test was
   * rewritten rather than relaxed.
   *
   * The original assertion — `blocking === []` — conflated two different claims:
   *   1. no rule ADDRESSED TO SOMEBODY ELSE fires (the GT-571 invariant), and
   *   2. no blocking rule fails for any reason at all.
   * Claim 2 is no longer true and SHOULD no longer be true: a rule declared
   * `blocking: true` that the engine reports `skipped` now emits a blocking
   * issue, because a blocking rule that skips used to be reported exactly like a
   * blocking rule that passed. The corpus currently has 70 such rules that
   * survive applicability filtering for a fresh satellite. Asserting `[]` here
   * would mean asserting that the GT-595 criterion does NOT work.
   *
   * Claim 1 is the one this suite exists for, and it is asserted below —
   * exactly, and over the same data — by requiring that every blocking finding
   * be accounted for: either it is the GT-595 invariant firing on a rule the
   * corpus itself declares blocking-and-unrunnable, or it is one of a NAMED set
   * of real verdicts. Nothing is excluded, no corpus is skipped, and the
   * applicability assertions in the tests that follow are untouched.
   */
  it('fails the run, and every blocking finding is accounted for', async () => {
    const result = await validatorFor().validate(satellitePath, CORE);
    const blocking = result.issues.filter(i => i.blocking);

    // GT-595 AC2 — the run FAILS now, and that is the criterion working.
    expect(result.status).toBe('failed');
    expect(result.blockingSkippedRuleIds!.length).toBeGreaterThan(0);

    // Every blocking-and-skipped id the coverage pass published surfaced as an
    // issue: the counters and the findings cannot disagree.
    const blockingIds = new Set(blocking.map(i => i.ruleId));
    for (const id of result.blockingSkippedRuleIds!) expect(blockingIds.has(id)).toBe(true);

    // …and NO blocking finding is a real verdict: every one of them is the
    // GT-595 invariant firing on a rule the corpus itself declares
    // blocking-and-unrunnable. A freshly scaffolded satellite does nothing wrong.
    //
    // This list used to read ['GIT-08', 'MTN-05'] and was pinned by name so that
    // closing the gap would show up here. Both were closed, by different means,
    // because they are different kinds of defect:
    //
    //   GIT-08  was a SCAFFOLD gap. Conventional Commits bind from the first
    //           commit and the corpus already states the convention verbatim, so
    //           `init` now emits commitlint.config.mjs, the commitlint packages
    //           in devDependencies, and (with --features hooks) a commit-msg hook
    //           that fails rather than skips when the tool is absent.
    //
    //   MTN-05  was NOT a scaffold gap, and emitting a `spec.boundedContexts`
    //           stanza would have been the wrong fix: the rule's own text says
    //           the strategy MUST be defined "before Phase 2 Design", and a
    //           phase-0 scaffold has no bounded contexts to declare. Satisfying
    //           it at init would have meant writing an invented persistence
    //           decision into every new repository — and then MTN-05 would pass
    //           for a reason nobody chose. It is annotated
    //           `appliesFromSdlcPhase: 2` instead, which is the applicability
    //           fact the rule always stated in prose.
    const skippedInvariant = new Set(result.blockingSkippedRuleIds!);
    const realViolations = blocking.filter(i => !skippedInvariant.has(i.ruleId));
    expect(realViolations.map(i => i.ruleId).sort()).toEqual([]);
  });

  it('never fires a blocking rule that applicability excluded', async () => {
    // This is the GT-571 invariant proper, stated over the blocking findings
    // directly: the audit's complaint was that 35 blocking findings were all
    // "addressed to somebody else". Whatever else fires, nothing excluded before
    // evaluation may appear as a blocking finding.
    const result = await validatorFor().validate(satellitePath, CORE);
    const notApplicable = new Set(result.notApplicableRuleIds!);

    const leaked = result.issues
      .filter(i => i.blocking && notApplicable.has(i.ruleId))
      .map(i => i.ruleId);

    expect(leaked).toEqual([]);
  });

  it('does not fire the vendor\'s own monorepo rules at a satellite', async () => {
    const result = await validatorFor().validate(satellitePath, CORE);
    const fired = new Set(result.issues.map(i => i.ruleId));

    // The two the audit named by hand, plus the rest of their families.
    for (const ruleId of ['CLI-RR-01', 'CLI-RR-02', 'CLI-PAR-01', 'TAX-05']) {
      expect(fired.has(ruleId)).toBe(false);
      expect(result.notApplicableRuleIds).toContain(ruleId);
    }
  });

  it('does not fire the rules of topologies the repository never declared', async () => {
    const result = await validatorFor().validate(satellitePath, CORE);
    const fired = new Set(result.issues.map(i => i.ruleId));

    // One representative per topology ruleset — a fresh scaffold declares none.
    for (const ruleId of ['AAI-R01', 'DAM-R01', 'EC-R01', 'ED-R01', 'SV-R01', 'DM-R02', 'MM-R02']) {
      expect(fired.has(ruleId)).toBe(false);
      expect(result.notApplicableRuleIds).toContain(ruleId);
    }
  });

  it('keeps the GT-569 denominator honest: not-applicable is NOT skipped', async () => {
    const result = await validatorFor().validate(satellitePath, CORE);

    // The GT-569 invariant still holds LITERALLY over the evaluated corpus…
    expect(result.rulesChecked + result.rulesSkipped! + result.rulesErrored!).toBe(result.rulesTotal);

    // …and the excluded rules are reported separately, over the full corpus.
    expect(result.rulesNotApplicable).toBeGreaterThan(0);
    expect(result.corpusTotal).toBe(result.rulesTotal! + result.rulesNotApplicable!);

    // Crucially: nothing excluded by applicability leaked into the skipped set,
    // which would have inflated the unevaluated fraction that `maxSkippedFraction`
    // gates on and failed a repository with nothing wrong with it.
    const skipped = new Set(result.skippedRuleIds);
    for (const id of result.notApplicableRuleIds!) expect(skipped.has(id)).toBe(false);
  });

  it('reports the exclusion instead of hiding it', async () => {
    const result = await validatorFor().validate(satellitePath, CORE);
    const advisory = result.issues.find(i => i.ruleId === 'GOV-RULE-NOT-APPLICABLE');

    expect(advisory).toBeDefined();
    expect(advisory!.blocking).toBe(false);
    expect(advisory!.description).toContain('excluded BEFORE evaluation');
  });

  it('still evaluates the whole corpus when a host opts out', async () => {
    const filtered = await validatorFor().validate(satellitePath, CORE);
    const unfiltered = await validatorFor({ applyRuleApplicability: false }).validate(satellitePath, CORE);

    expect(unfiltered.rulesNotApplicable).toBe(0);
    expect(unfiltered.rulesTotal).toBe(filtered.corpusTotal);
    // The escape hatch is only useful if it really restores the old behaviour.
    expect(unfiltered.issues.filter(i => i.blocking).length).toBeGreaterThan(0);
  });
});

describe('GT-571 · the Core monorepo keeps its own rules', () => {
  it('never filters a `core`-audience rule out of the Core itself', async () => {
    const fs = new NodeFileSystemProvider() as any;
    const rules = await new DiskRulesetRepository(fs, silentLogger).loadAllRulesets(CORE);
    const index = await RuleApplicabilityIndex.load(fs, CORE, path.sep);

    // The Core declares progressive phase F1 (⇒ modular-monolith) at SDLC phase 1.
    const asCore: ApplicabilityContext = {
      audience: 'core',
      declaredTopologies: ['modular-monolith'],
      sdlcPhase: 1,
    };
    const { notApplicable } = partitionByApplicability(rules as NormalizedRule[], { index, context: asCore });
    const excluded = new Set(notApplicable.map(n => n.rule.id));

    // Core-only rules stay in force against the Core…
    for (const ruleId of ['CLI-RR-01', 'CLI-PAR-01', 'TAX-05', 'TAX-11', 'OCB-01']) {
      expect(excluded.has(ruleId)).toBe(false);
    }
    // …as do the rules of the topology it declares, and its phase-1 artifacts.
    for (const ruleId of ['MM-R02', 'DEP-01', 'CB-VAL-01']) {
      expect(excluded.has(ruleId)).toBe(false);
    }
    // Only the seven topologies it did NOT declare, and the satellite-only rule.
    for (const ruleId of ['SV-R01', 'AAI-R01', 'MS-R01', 'TAX-06']) {
      expect(excluded.has(ruleId)).toBe(true);
    }
  });

  it('annotates the corpus families the audit named', async () => {
    const fs = new NodeFileSystemProvider() as any;
    const index = await RuleApplicabilityIndex.load(fs, CORE, path.sep);

    expect(index.get('CLI-RR-01')?.audience).toBe('core');
    expect(index.get('TAX-05')?.audience).toBe('core');
    expect(index.get('TAX-06')?.audience).toBe('satellite');
    expect(index.get('SV-R01')?.topologies).toEqual(['serverless']);
    expect(index.get('MM-R02')?.topologies).toEqual(['modular-monolith']);
    expect(index.get('DEP-01')?.appliesFromSdlcPhase).toBe(1);

    // An unannotated rule keeps the permissive default.
    expect(index.get('TAX-01')?.audience).toBe('both');
    expect(index.get('TAX-01')?.topologies).toBeUndefined();
    expect(index.get('TAX-01')?.appliesFromSdlcPhase).toBeUndefined();
  });

  it('defers MTN-05 to Design without weakening it', async () => {
    // MTN-05's own description says the multi-tenant schema strategy "MUST be
    // defined before Phase 2 Design". That was prose; it is now an applicability
    // fact, which is why a phase-0 scaffold with no bounded contexts is no longer
    // failed by it. The half that matters is the second assertion: the rule is
    // DEFERRED, not disabled — a repository that has reached Design is still
    // judged by it, and would be failed for exactly the same reason as before.
    const fs = new NodeFileSystemProvider() as any;
    const rules = await new DiskRulesetRepository(fs, silentLogger).loadAllRulesets(CORE);
    const index = await RuleApplicabilityIndex.load(fs, CORE, path.sep);

    expect(index.get('MTN-05')?.appliesFromSdlcPhase).toBe(2);

    const excludedAt = (sdlcPhase: number) => {
      const ctx: ApplicabilityContext = { audience: 'satellite', declaredTopologies: [], sdlcPhase };
      const { notApplicable } = partitionByApplicability(rules as NormalizedRule[], { index, context: ctx });
      return new Set(notApplicable.map(n => n.rule.id)).has('MTN-05');
    };

    expect(excludedAt(0)).toBe(true);   // the freshly scaffolded satellite
    expect(excludedAt(1)).toBe(true);   // Conception — still nothing to declare
    expect(excludedAt(2)).toBe(false);  // Design — the rule binds, unchanged
    expect(excludedAt(3)).toBe(false);
  });
});
/**
 * GT-688 — AC6, the falsifier.
 *
 * `ApplicabilityContext.declaredTopologies` is the ONLY mechanism in the tree
 * where a topology changes which rules run (`notApplicableReason`). Everything
 * else GT-688 touches — the manifest plural, the result arity, the surface
 * arguments — is what makes this path EXPRESSIBLE; this is the path itself.
 *
 * The two halves are run against the REAL corpus and a satellite with NO
 * `evolith.yaml` — the ADR-0101 case, where a stateless consumer's declaration
 * has nowhere on disk to live and every topology-scoped rule was therefore
 * excluded in silence.
 *
 * Asserted on the ID SETS, never on `status`: `buildApplicabilityFilter` fails
 * OPEN, so a dropped override reads as a passing (over-broad) run rather than an
 * error, and a status assertion would go green on the bug.
 */
describe('GT-688 · an inline composition puts the declared topology corpus in scope', () => {
  /**
   * Read from the shipped ruleset, NOT hand-listed. GT-683 added `AAI-R10` and a
   * hardcoded array turned this test red for a reason that had nothing to do with
   * what it asserts — the test knew the corpus of one particular day.
   *
   * Not vacuous: this reads the JSON file directly while the code under test
   * reaches the same rules through `DiskRulesetRepository` and
   * `RuleApplicabilityIndex`, so a rule that exists on disk but never enters scope
   * still fails here. The length assertion keeps an emptied ruleset from passing
   * over zero ids.
   */
  const AAI: string[] = (
    JSON.parse(
      nodeFs.readFileSync(path.join(CORE, 'src/rulesets/topologies/agentic-ai/agentic-ai.rules.json'), 'utf8'),
    ) as { rules: Array<{ id: string }> }
  ).rules.map((r) => r.id);

  it('the corpus this test compares against is real', () => {
    expect(AAI.length).toBeGreaterThanOrEqual(9);
  });

  /** Applicability over the REAL corpus for one declared composition. */
  async function partitionFor(declaredTopologies: readonly string[]) {
    const fs = new NodeFileSystemProvider() as any;
    const rules = await new DiskRulesetRepository(fs, silentLogger).loadAllRulesets(CORE);
    const index = await RuleApplicabilityIndex.load(fs, CORE, path.sep);
    const context: ApplicabilityContext = { audience: 'satellite', declaredTopologies };
    const { applicable, notApplicable } = partitionByApplicability(rules as NormalizedRule[], { index, context });
    return {
      applicableIds: new Set(applicable.map((r) => r.id)),
      notApplicableIds: new Set(notApplicable.map((n) => n.rule.id)),
    };
  }

  it('excludes the whole AAI corpus when the composition does not name agentic-ai', async () => {
    // The "PASS before the fix" half: this is what a scalar `modular-monolith`
    // has always produced, and it is CORRECT — the repository never claimed to
    // be an agentic system.
    const { applicableIds, notApplicableIds } = await partitionFor(['modular-monolith']);
    for (const id of AAI) {
      expect(notApplicableIds.has(id)).toBe(true);
      expect(applicableIds.has(id)).toBe(false);
    }
  });

  it('puts the whole AAI corpus in scope when the composition names agentic-ai', async () => {
    // The half that was UNREACHABLE before GT-688: no surface could express this
    // composition to the applicability context at all.
    const { applicableIds, notApplicableIds } = await partitionFor(['modular-monolith', 'agentic-ai']);
    for (const id of AAI) {
      expect(applicableIds.has(id)).toBe(true);
      expect(notApplicableIds.has(id)).toBe(false);
    }
  });

  it('is ADDITIVE — declaring agentic-ai takes nothing out of scope', async () => {
    // `notApplicableReason` is an OR over declared topologies, so widening the
    // composition can only ever ADD rules. Stated as a set relation rather than a
    // count so it cannot be satisfied by a coincidental swap.
    const narrow = await partitionFor(['modular-monolith']);
    const wide = await partitionFor(['modular-monolith', 'agentic-ai']);

    for (const id of narrow.applicableIds) expect(wide.applicableIds.has(id)).toBe(true);
    // …and exactly the AAI corpus is what entered scope. Measured, not assumed.
    const entered = [...wide.applicableIds].filter((id) => !narrow.applicableIds.has(id)).sort();
    expect(entered).toEqual([...AAI].sort());
  });

  it('reaches the corpus through validate() on a satellite with no evolith.yaml', async () => {
    // End to end through the public seam the pipeline uses, not just the pure
    // partition function: `validate(sat, core, undefined, {topologies})`.
    const bare = nodeFs.mkdtempSync(path.join(os.tmpdir(), 'gt688-bare-'));

    const withComposition = await validatorFor().validate(bare, CORE, undefined, {
      topologies: ['modular-monolith', 'agentic-ai'],
    });
    const without = await validatorFor().validate(bare, CORE);

    const naWith = new Set(withComposition.notApplicableRuleIds!);
    const naWithout = new Set(without.notApplicableRuleIds!);

    for (const id of AAI) {
      // Declared ⇒ evaluated. NOT declared ⇒ excluded. This is the whole gap.
      expect(naWith.has(id)).toBe(false);
      expect(naWithout.has(id)).toBe(true);
    }
  });
});

/**
 * GT-688 · a contradictory composition is REFUSED where the union is applied.
 *
 * The refusal was first written into the `topology` KIND evaluator. That is the
 * wrong seam: `evolith evaluate` builds its context with
 * `kinds: ['gate','compliance']` (evaluate.command.ts), so the `topology` kind
 * never runs on the enforcement path and a composition naming two
 * progressive-axis topologies sailed through with MM-R* and MS-R* both in scope
 * — two blocking, mutually unsatisfiable corpora — and no
 * `TOPOLOGY_COMPOSITION_CONFLICT` anywhere in the verdict.
 *
 * So the enforcing copy lives in `RulesetValidatorService.validate`, beside the
 * union it refers to. `validate` is the ONE call every surface traverses, and it
 * takes no `kinds` argument at all — there is nothing a caller can ask for that
 * routes around it. These tests exercise that seam directly, which is the
 * bypassed path, not the kind evaluator that was already covered.
 */
describe('GT-688 · the progressive axis is refused, never unioned', () => {
  const CONFLICT = 'TOPOLOGY_COMPOSITION_CONFLICT';
  const bareSatellite = () => nodeFs.mkdtempSync(path.join(os.tmpdir(), 'gt688-conflict-'));

  it('refuses two progressive-axis members through validate(), with no kind requested', async () => {
    const result = await validatorFor().validate(bareSatellite(), CORE, undefined, {
      topologies: ['modular-monolith', 'microservices'],
    });

    const conflict = result.issues.find((i) => i.ruleId === CONFLICT);
    expect(conflict).toBeDefined();
    expect(conflict!.blocking).toBe(true);
    // Both members are NAMED, so the report says which two claims collide
    // instead of only that something did.
    expect(conflict!.description).toContain('modular-monolith');
    expect(conflict!.description).toContain('microservices');
    expect(result.status).toBe('failed');
  });

  it('does NOT refuse a legal cross-axis composition', async () => {
    // agentic-ai is not on the progressive axis; composing it is the whole point
    // of the feature and must stay silent.
    const result = await validatorFor().validate(bareSatellite(), CORE, undefined, {
      topologies: ['modular-monolith', 'agentic-ai'],
    });
    expect(result.issues.find((i) => i.ruleId === CONFLICT)).toBeUndefined();
  });

  it('refuses even when applicability filtering is switched OFF', async () => {
    // `applyRuleApplicability: false` opts a host out of NARROWING the corpus.
    // It must not also opt it out of being told the composition it sent is
    // incoherent — otherwise one host option silently disables the refusal.
    const result = await validatorFor({ applyRuleApplicability: false }).validate(
      bareSatellite(),
      CORE,
      undefined,
      { topologies: ['distributed-modules', 'microservices'] },
    );
    expect(result.issues.find((i) => i.ruleId === CONFLICT)?.blocking).toBe(true);
  });

  it('refuses a composition that becomes contradictory only after the UNION with disk', async () => {
    // The satellite declares F1 (modular-monolith) on disk; the caller sends
    // microservices inline. Neither declaration is contradictory on its own —
    // the union is, and the union is what the filter uses.
    const sat = bareSatellite();
    nodeFs.writeFileSync(
      path.join(sat, 'evolith.yaml'),
      ['apiVersion: evolith.dev/v1', 'kind: Satellite', 'metadata:', '  name: s', '  phase: F1', ''].join('\n'),
    );

    const result = await validatorFor().validate(sat, CORE, undefined, {
      topologies: ['microservices'],
    });
    expect(result.issues.find((i) => i.ruleId === CONFLICT)?.blocking).toBe(true);
  });
});
