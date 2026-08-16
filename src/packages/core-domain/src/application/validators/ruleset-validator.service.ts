import { Injectable, Optional, Inject } from '@nestjs/common';
import * as path from 'path';
import { ILogger, IFileSystem, IConfigParser } from '../../domain/interfaces';
import { RuleEvaluationEngine, emptyRuleCoverage, summarizeRuleCoverage } from './rule-evaluation-engine';
import { RulesetsNotFoundError } from '../../domain/ports/ruleset-repository.port';
import { NativeEvaluator } from './evaluators/native-evaluator';
import { OpaEvaluator } from './evaluators/opa-evaluator';
import { createCompositeEnforcerStrategy } from './enforcement/enforcer-subsystem';
import type { IProcessRunner } from './enforcement/enforcer.types';
import type { IEnforcerMetrics } from './enforcement/enforcer-metrics';
import { TopologyCatalogService } from '../services/topology-catalog.service';
import {
  ArchitectureValidationResult, EvolithYaml, RULESET_VALIDATOR_OPTIONS,
  RuleCoverage, RulesetValidatorOptions, SelectionReport, ValidationIssue, ValidationResult,
} from './ruleset-validator.types';
import { loadRulesetById } from './ruleset-id-loader';
import type { RulesetSelection } from './ruleset-selection';
import type { RulesetCatalog } from './ruleset-catalog';
import { runArchitectureValidation } from './architecture-validator';
import type { NotApplicableRule, RuleApplicabilityFilter } from './rule-evaluation-engine';
import {
  ApplicabilityContext,
  RuleApplicabilityIndex,
  describeNotApplicable,
  progressiveAxisConflict,
  resolveApplicabilityContext,
} from './rule-applicability';
import type { EvaluationFacts } from '../../domain/satellite-manifest';

export {
  ValidationResult, ValidationIssue, EvolithYaml, ArchitectureValidationResult,
  RuleCoverage, RuleApplicabilitySummary, RulesetValidatorOptions, RULESET_VALIDATOR_OPTIONS,
  SelectionReport,
} from './ruleset-validator.types';

@Injectable()
export class RulesetValidatorService {
  private readonly logger: ILogger;
  private readonly fs: IFileSystem;
  private readonly configParser: IConfigParser;
  private readonly engine: RuleEvaluationEngine;
  private readonly topologyCatalog?: TopologyCatalogService;
  /** GT-569 — optional coverage floor; see {@link RulesetValidatorOptions.maxSkippedFraction}. */
  private readonly maxSkippedFraction?: number;
  /** GT-571 — filter the corpus by rule audience / topology / SDLC phase. */
  private readonly applyRuleApplicability: boolean;
  /**
   * GT-664 — RETAINED so a caller that rebuilds this service can carry the
   * enforcer subsystem with it.
   *
   * The runner used to be read in the constructor and forgotten, which made a
   * rebuilt validator silently weaker than the one it was copied from:
   * `ValidateSatelliteUseCase` reconstructs on every CLI `validate` and had no
   * way to pass this on, so every `enforce:` rule fell back to the native engine
   * on that surface. Kept private and read only by that rebuild.
   */
  private readonly processRunner?: IProcessRunner;
  private readonly metrics?: IEnforcerMetrics;
  /**
   * GT-676 — the options this instance was built from, retained WHOLE.
   *
   * `rebuildValidatorForEngine` used to reconstruct from a hand-written list of
   * fields, and every option added since had to be remembered there. It was not:
   * measured the day this was added, the rebuild carried 7 of 10 and silently
   * dropped `topologyCatalog`, `applyRuleApplicability` and `maxSkippedFraction` —
   * the last of which is the coverage floor a caller had just asked for. That is
   * GT-664's defect exactly (`processRunner` dropped the same way), and the fix
   * there was to add the missing field, which left the next one to be forgotten.
   *
   * Keeping the object means the rebuild spreads it and cannot under-fill.
   */
  private readonly options: RulesetValidatorOptions;

  constructor(@Optional() @Inject(RULESET_VALIDATOR_OPTIONS) options?: RulesetValidatorOptions) {
    if (!options?.fileSystem) throw new Error('IFileSystem is required');
    if (!options?.logger) throw new Error('ILogger is required');
    if (!options?.configParser) throw new Error('IConfigParser is required');
    if (!options?.rulesetRepo) throw new Error('IRulesetRepository is required');

    this.options = options;
    this.logger = options.logger;
    this.fs = options.fileSystem;
    this.configParser = options.configParser;
    this.topologyCatalog = options.topologyCatalog;
    this.maxSkippedFraction = options.maxSkippedFraction;
    this.applyRuleApplicability = options.applyRuleApplicability !== false;
    this.processRunner = options.processRunner;
    this.metrics = options.metrics;

    const baseStrategy = options.engineType === 'opa'
      ? new OpaEvaluator(this.fs, this.logger)
      : new NativeEvaluator(this.fs, this.logger, this.configParser);

    // GT-524 wiring: when a host injects a process runner, route `enforce:` rules through
    // the enforcer subsystem (sandbox-wrapped adapters). Non-forking — without enforcer
    // rules the composite delegates everything to the base strategy.
    const strategy = options.processRunner
      ? createCompositeEnforcerStrategy(baseStrategy, options.processRunner, { metrics: options.metrics })
      : baseStrategy;

    this.engine = new RuleEvaluationEngine({
      fileSystem: this.fs,
      logger: this.logger,
      strategy,
      rulesetRepo: options.rulesetRepo,
      configParser: this.configParser,
    });
  }

  /**
   * GT-659 — `selection` is what the CALLER asked to be evaluated against.
   *
   * Optional and additive: absent means the whole corpus, which is what every
   * existing caller gets and what every recorded verdict was produced under.
   */
  async validate(
    satellitePath: string,
    corePath?: string,
    selection?: RulesetSelection,
    /**
     * GT-688 — facts the CALLER declared about the repository that are not on
     * its disk. `topologies` is the confirmed composition, unioned with
     * `evolith.yaml` and never substituted for it; `facts` is the projected
     * `EvaluationFacts` document, forwarded to the engine so `input.context`
     * exists in the OPA input the corpus policies actually see.
     */
    declared?: {
      readonly topologies?: readonly string[];
      readonly facts?: EvaluationFacts;
    },
  ): Promise<ValidationResult> {
    const issues: ValidationIssue[] = [];
    // GT-569: the verdict reports its own denominator. `rulesChecked` keeps
    // meaning "actually evaluated"; the rest of the corpus is no longer
    // invisible — it is counted, named, and (for MUST rules) surfaced as a
    // WARNING issue by `toValidationIssues`.
    let coverage: RuleCoverage = emptyRuleCoverage();
    // GT-571: rules the corpus contains but that do not address this repository.
    // Deliberately NOT folded into `coverage` — see RuleApplicabilitySummary.
    let notApplicable: NotApplicableRule[] = [];
    // GT-661 — the scope of this verdict, reported rather than left implicit.
    // Seeded as `core-default` so a run that dies before the engine returns
    // still says which scope it was attempting, instead of omitting the field
    // and letting a reader assume the caller had asked for something.
    let selectionReport: SelectionReport = {
      source: 'core-default', requested: [], matched: [], unmatched: [],
      rulesSelected: 0, corpusTotal: 0,
    };

    const resolvedCorePath = corePath || this.findCorePath(satellitePath);
    const evolithYamlPath = path.join(satellitePath, 'evolith.yaml');

    let coreRefVersion: string | null = null;
    let coreRefPath: string | null = null;

    if (await this.fs.exists(evolithYamlPath)) {
      const evolithYaml = await this.loadEvolithYaml(evolithYamlPath);
      coreRefVersion = evolithYaml.coreRef?.version || null;
      coreRefPath = evolithYaml.coreRef?.path || null;
    } else {
      issues.push({
        ruleId: 'GOV-000',
        severity: 'MUST',
        category: 'governance',
        title: 'Missing evolith.yaml',
        description: 'Every satellite repository must have an evolith.yaml file at the root.',
        blocking: true,
      });
    }

    // GT-688 — the applicability context is resolved BEFORE the try/catch that
    // guards the engine, because two different things depend on it and only one
    // of them may fail open. The FILTER may fail open (a broken index must never
    // hide a rule, GT-571). The REFUSAL below may not: it is a statement about
    // what the caller declared, and the caller's own declaration is never
    // unreadable.
    const applicabilityContext = await this.resolveDeclaredContext(
      satellitePath,
      resolvedCorePath,
      declared,
    );
    const conflictIssue = this.compositionConflictIssue(applicabilityContext?.declaredTopologies);
    if (conflictIssue) issues.push(conflictIssue);

    try {
      const filter = await this.buildApplicabilityFilter(applicabilityContext, resolvedCorePath);
      const { results: engineResults, notApplicable: excluded, selection: applied } =
        await this.engine.discoverAndEvaluate(
          satellitePath,
          resolvedCorePath,
          filter,
          selection,
          declared?.facts,
        );
      notApplicable = excluded;

      // GT-661 — `applied` is present ONLY when the caller restricted the run
      // (see `discoverAndEvaluate`), so its absence is exactly the
      // `core-default` case and needs no separate flag.
      selectionReport = applied
        ? {
            source: 'caller',
            requested: [...applied.matched, ...applied.unmatched],
            matched: [...applied.matched],
            unmatched: [...applied.unmatched],
            rulesSelected: applied.selected.length,
            corpusTotal: applied.corpusTotal,
          }
        : {
            source: 'core-default',
            requested: [], matched: [], unmatched: [],
            rulesSelected: engineResults.length + excluded.length,
            corpusTotal: engineResults.length + excluded.length,
          };

      // GT-659 — a ref that matched NOTHING is a caller asking for a ruleset this
      // Core does not have, and the one answer it must never receive is a clean
      // report. Zero rules evaluated with zero violations is indistinguishable
      // from a passing satellite, which is exactly the shape of false assurance
      // this validator already refuses elsewhere (GT-474, the empty corpus).
      if (applied?.unmatched.length) {
        issues.push({
          ruleId: 'SEL-01',
          severity: 'MUST',
          category: 'ruleset-selection',
          title: 'Requested ruleset not found in this Core',
          description:
            `${applied.unmatched.length} requested ruleset ref(s) matched no rule in the corpus: ` +
            `${applied.unmatched.join(', ')}. Nothing was evaluated against them, so this report says ` +
            'nothing about them. The available refs are published by the reference catalogue.',
          blocking: true,
        });
      }
      coverage = summarizeRuleCoverage(engineResults);
      issues.push(...this.engine.toValidationIssues(engineResults));
      const applicabilityIssue = this.applicabilityAdvisory(notApplicable);
      if (applicabilityIssue) issues.push(applicabilityIssue);
      const thresholdIssue = this.coverageThresholdIssue(coverage);
      if (thresholdIssue) issues.push(thresholdIssue);
    } catch (err: unknown) {
      // GT-474: an unresolvable/empty ruleset corpus must never be downgraded to
      // a warning here — that is exactly how `validate` came to report
      // `rulesChecked: 0` with a reassuring status. Let it abort the run.
      if (err instanceof RulesetsNotFoundError) throw err;
      this.logger.warn(`Rule engine error: ${err instanceof Error ? err.message : String(err)}`);
    }

    const status = issues.some(i => i.blocking) ? 'failed' : issues.length > 0 ? 'warning' : 'passed';

    return {
      status,
      rulesChecked: coverage.rulesChecked,
      rulesSkipped: coverage.rulesSkipped,
      rulesErrored: coverage.rulesErrored,
      rulesTotal: coverage.rulesTotal,
      skippedRuleIds: coverage.skippedRuleIds,
      erroredRuleIds: coverage.erroredRuleIds,
      rulesNotApplicable: notApplicable.length,
      notApplicableRuleIds: notApplicable.map(n => n.rule.id),
      corpusTotal: coverage.rulesTotal + notApplicable.length,
      // GT-595 — the classification behind `rulesSkipped`, so a reader can tell
      // coverage debt from rules that nothing will ever run.
      rulesNonExecutable: coverage.rulesNonExecutable,
      nonExecutableRuleIds: coverage.nonExecutableRuleIds,
      rulesExecutable: coverage.rulesExecutable,
      blockingNonExecutableRuleIds: coverage.blockingNonExecutableRuleIds,
      // GT-595 AC2 — every blocking rule that did not run. Non-empty ⇒ the
      // engine emitted one `blocking: true` issue per id, so `status` is
      // 'failed' above; the ids are published so the offenders are enumerable
      // without parsing issue text.
      blockingSkippedRuleIds: coverage.blockingSkippedRuleIds,
      perRuleset: coverage.perRuleset,
      // GT-661 — WHY this scope, not just how much of it.
      selection: selectionReport,
      issues,
      coreRef: { version: coreRefVersion, path: coreRefPath },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * GT-688 — the UNION of what the repository declares on disk and what the
   * caller declared inline, resolved once per run.
   *
   * Separated from {@link buildApplicabilityFilter} so the refusal in
   * {@link compositionConflictIssue} does not depend on `applyRuleApplicability`
   * or on the index loading: a host that opted out of applicability filtering
   * has opted out of NARROWING the corpus, not out of being told that the
   * composition it sent is self-contradictory.
   *
   * Returns `undefined` only when the declaration itself could not be read, in
   * which case the run proceeds unfiltered (fail-open, GT-571).
   */
  private async resolveDeclaredContext(
    satellitePath: string,
    corePath: string,
    declared?: { readonly topologies?: readonly string[] },
  ): Promise<ApplicabilityContext | undefined> {
    try {
      return await resolveApplicabilityContext(
        { fs: this.fs, configParser: this.configParser },
        satellitePath,
        corePath,
        path.sep,
        { declaredTopologies: declared?.topologies },
      );
    } catch (err: unknown) {
      this.logger.warn(
        `Declared applicability context could not be resolved: ` +
        `${err instanceof Error ? err.message : String(err)}`,
      );
      return undefined;
    }
  }

  /**
   * GT-688 — REFUSED, never unioned.
   *
   * A composition that confirms two progressive-axis topologies asks one
   * repository to be a single deployment unit AND a set of independently
   * deployed services. `notApplicableReason` would happily OR the two and put
   * both blocking corpora in scope, which reads as "stricter" and is in fact
   * incoherent — no repository can satisfy it, so the verdict stops carrying
   * information.
   *
   * Emitted from the validator, i.e. from the path EVERY caller traverses,
   * because the same refusal expressed in the `topology` kind evaluator is
   * bypassed by `evaluate`'s `kinds: ['gate','compliance']`.
   */
  private compositionConflictIssue(
    declaredTopologies: readonly string[] | undefined,
  ): ValidationIssue | undefined {
    const progressive = progressiveAxisConflict(declaredTopologies ?? []);
    if (progressive.length < 2) return undefined;
    return {
      ruleId: 'TOPOLOGY_COMPOSITION_CONFLICT',
      severity: 'MUST',
      category: 'topology',
      title: 'Contradictory topology composition',
      description:
        `The confirmed composition names ${progressive.length} progressive-axis topologies ` +
        `(${progressive.join(', ')}). At most ONE is admissible: they are mutually exclusive on a ` +
        'single repository (a single deployment unit versus independently deployed services), and ' +
        'their blocking rule corpora contradict each other. Nothing was narrowed away — the run is ' +
        'refused instead, because a verdict produced under an unsatisfiable premise says nothing.',
      blocking: true,
    };
  }

  /**
   * GT-571 — build the corpus pre-filter for this run, or `undefined` when the
   * host opted out via `applyRuleApplicability: false`.
   *
   * Fail-open: if the applicability facts cannot be read the run proceeds with
   * NO filter, i.e. exactly the pre-GT-571 behaviour. A broken index must never
   * be able to hide a rule.
   */
  private async buildApplicabilityFilter(
    context: ApplicabilityContext | undefined,
    corePath: string,
  ): Promise<RuleApplicabilityFilter | undefined> {
    if (!this.applyRuleApplicability || !context) return undefined;
    try {
      const index = await RuleApplicabilityIndex.load(this.fs, corePath, path.sep);
      return { index, context };
    } catch (err: unknown) {
      this.logger.warn(
        `Rule applicability could not be resolved; evaluating the full corpus: ` +
        `${err instanceof Error ? err.message : String(err)}`,
      );
      return undefined;
    }
  }

  /**
   * GT-571 — an exclusion must be visible, not silent.
   *
   * Non-blocking by construction: it reports rules that were never candidates,
   * which is information, not a violation. It is what stops "0 blocking
   * findings" from meaning "we quietly stopped looking".
   */
  private applicabilityAdvisory(notApplicable: readonly NotApplicableRule[]): ValidationIssue | undefined {
    if (notApplicable.length === 0) return undefined;

    const byReason = new Map<string, string[]>();
    for (const n of notApplicable) {
      const bucket = byReason.get(n.reason) ?? [];
      bucket.push(n.rule.id);
      byReason.set(n.reason, bucket);
    }

    const parts = [...byReason.entries()].map(
      ([reason, ids]) =>
        `${ids.length} ${describeNotApplicable(reason as NotApplicableRule['reason'])} ` +
        `(e.g. ${ids.slice(0, 5).join(', ')}${ids.length > 5 ? ', …' : ''})`,
    );

    return {
      ruleId: 'GOV-RULE-NOT-APPLICABLE',
      severity: 'COULD',
      category: 'governance',
      title: `${notApplicable.length} corpus rules do not apply to this repository`,
      description:
        `${notApplicable.length} of the corpus rules were excluded BEFORE evaluation: ` +
        `${parts.join('; ')}. They are not counted as checked, skipped or errored — ` +
        'they were never candidates. Declare a topology in `spec.design.topology.confirmed` ' +
        'and advance `spec.sdlc.currentPhase` in evolith.yaml to bring the corresponding ' +
        'rules into scope.',
      blocking: false,
    };
  }

  /**
   * GT-569 (AC3): a run whose unevaluated fraction exceeds the configured floor
   * must FAIL rather than sign off on a corpus that mostly did not execute.
   * Opt-in — with no `maxSkippedFraction` configured this returns `undefined`
   * and behaviour is identical to pre-GT-569.
   */
  private coverageThresholdIssue(coverage: RuleCoverage): ValidationIssue | undefined {
    const threshold = this.maxSkippedFraction;
    if (threshold === undefined || coverage.rulesTotal === 0) return undefined;

    // GT-595: measure against the EXECUTABLE corpus. Charging the gate for 129
    // rules that carry no check made the floor unreachable by any amount of
    // engineering, which is the fastest way to get a threshold switched off.
    // Non-executable rules are still named, in the description and in
    // `GOV-RULE-NON-EXECUTABLE`, so the exclusion is auditable rather than
    // convenient.
    const nonExecutable = coverage.rulesNonExecutable ?? 0;
    const denominator = coverage.rulesExecutable ?? coverage.rulesTotal;
    if (denominator === 0) return undefined;

    const unevaluated = coverage.rulesSkipped - nonExecutable + coverage.rulesErrored;
    const fraction = unevaluated / denominator;
    if (fraction <= threshold) return undefined;

    const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
    const exclusion =
      nonExecutable > 0
        ? ` ${nonExecutable} further rules are excluded from the denominator as non-executable ` +
          '(documentation-only or declaring no check at all); see GOV-RULE-NON-EXECUTABLE.'
        : '';

    return {
      ruleId: 'GOV-COVERAGE-THRESHOLD',
      severity: 'MUST',
      category: 'governance',
      title: 'Rule coverage below the configured floor',
      description:
        `${unevaluated} of ${denominator} executable rules were not evaluated ` +
        `(${coverage.rulesSkipped - nonExecutable} skipped, ${coverage.rulesErrored} errored) — ${pct(fraction)}, ` +
        `above the configured maximum of ${pct(threshold)}. Only ${coverage.rulesChecked} rules actually ran, ` +
        `so this verdict does not cover the declared corpus (${coverage.rulesTotal} rules).${exclusion}`,
      blocking: true,
    };
  }

  async loadRulesetById(corePath: string, rulesetId: string): Promise<ValidationIssue[]> {
    return loadRulesetById(this.fs, this.logger, corePath, rulesetId);
  }

  /**
   * GT-660 — publish what this Core can evaluate, so a caller can configure.
   *
   * Delegates to the engine, which loads through the same `loadAllRulesets` a
   * validation run uses. Exposed on the service because that is what every
   * surface already holds: adding a second construction path for the engine
   * would be a second answer to «what does this Core carry», and two answers to
   * that question is the defect this method exists to remove.
   *
   * It evaluates nothing and decides nothing. The Core PROPOSES.
   */
  async catalog(corePath?: string): Promise<RulesetCatalog> {
    // No satellite is involved in a catalogue read — there is nothing to
    // evaluate — so an absent path falls back to the caller's cwd exactly as
    // `findCorePath` would from a satellite root. A surface that knows better
    // (the CLI's rulesets resolver, the API's configured root) passes it in.
    return this.engine.discoverCatalog(corePath || this.findCorePath(process.cwd()));
  }

  async validateArchitecture(
    satellitePath: string,
    corePath?: string,
    options?: { level?: string; topologies?: string[] },
  ): Promise<ArchitectureValidationResult> {
    const resolvedCorePath = corePath || this.findCorePath(satellitePath);
    return runArchitectureValidation(
      { fs: this.fs, engine: this.engine, topologyCatalog: this.topologyCatalog },
      satellitePath,
      resolvedCorePath,
      options,
    );
  }

  private async loadEvolithYaml(filePath: string): Promise<EvolithYaml> {
    const content = await this.fs.readFile(filePath);
    return this.configParser.parse(content) as EvolithYaml;
  }

  private findCorePath(satellitePath: string): string {
    const parts = satellitePath.split(path.sep);
    while (parts.length > 0) {
      parts.pop();
      const candidate = path.join(parts.join(path.sep), 'rulesets');
      if (this.fs.existsSync(candidate)) {
        return parts.join(path.sep);
      }
    }
    return path.join(satellitePath, '..', 'evolith');
  }
}
