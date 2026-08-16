import { Command, Option } from 'nest-commander';
import { randomUUID } from 'node:crypto';
import { ValidateSatelliteUseCase } from '@beyondnet/evolith-core-domain/application/use-cases/validate-satellite.use-case';
import { ValidationResult, ValidationIssue, RulesetValidatorService } from '@beyondnet/evolith-core-domain/application/validators/ruleset-validator.service';
import { rebuildValidatorForEngine } from '@beyondnet/evolith-core-domain/application/validators/ruleset-validator.rebuild';
import { RulesetsNotFoundError } from '@beyondnet/evolith-core-domain/domain/ports/ruleset-repository.port';
import { OutputFormatterService, OutputFormat } from '../../infrastructure/formatters/output-formatter.service';
import { resolveRulesets } from '../../infrastructure/paths/rulesets-resolver';
import { resolveCoreOverride } from '../../infrastructure/paths/core-resolver';
import { resolveSatelliteDetailed } from '../../infrastructure/paths/satellite-resolver';
import { BaseEvolithCommand } from '../../infrastructure/cli/base-command';
import { PromptService } from '../../infrastructure/prompts/prompt.service';
import { ConfigService } from '../../infrastructure/config/config.service';
import {
  createSuccessEnvelope,
  createErrorEnvelope,
  OUTPUT_ENVELOPE_SCHEMA_VERSION,
} from '@beyondnet/evolith-core-domain/domain/gate-evidence';
import { CLI_EXIT_CODES, exitCodeForErrorCode, exitWith } from '../../infrastructure/cli/exit-codes';

interface ValidateCommandOptions {
  format?: string;
  output?: string;
  satellite?: string;
  core?: string;
  ruleset?: string;
  /** GT-659 — canonical ruleset refs from the catalogue, repeatable. */
  select?: string[];
  architecture?: boolean;
  topology?: string[];
  engine?: string;
  /** GT-676 — coverage floor: fail when more than this fraction of applicable rules did not run. */
  maxSkippedFraction?: number;
  manifest?: string;
  phase?: string;
  adr?: string;
  file?: string;
  composable?: boolean;
}

interface ComposableValidationResult {
  status: 'passed' | 'failed' | 'warning';
  modes: ModeValidationResult[];
  totalRulesChecked: number;
  /** GT-569 — the denominator behind `totalRulesChecked`. */
  totalRulesSkipped: number;
  totalRulesErrored: number;
  totalRulesTotal: number;
  skippedRuleIds: string[];
  erroredRuleIds: string[];
  totalIssues: number;
  passedRules: number;
  failedRules: number;
  performanceMs: number;
}

interface ModeValidationResult {
  mode: string;
  status: string;
  rulesChecked: number;
  /** GT-569 — optional per-mode coverage; absent ⇒ the mode reports only what it evaluated. */
  rulesSkipped?: number;
  rulesErrored?: number;
  rulesTotal?: number;
  skippedRuleIds?: string[];
  erroredRuleIds?: string[];
  issues: ModeValidationIssue[];
}

interface ModeValidationIssue {
  ruleId: string;
  status: string;
  message: string;
  severity: string;
  file?: string;
  line?: number;
  remediation?: string;
}

/**
 * GT-569 — guarantee the coverage denominator on the way out.
 *
 * `rulesChecked` alone is unreadable: it silently redefines its own denominator.
 * Every `validate` surface (human, table/yaml/markdown and `--format json`)
 * therefore reports checked / skipped / errored / total. When a producer did not
 * report the breakdown, the honest floor is "nothing was reported as unevaluated"
 * — `skipped = errored = 0` and `total = checked` — never a guessed corpus size.
 */
export function withCoverageDenominator(result: ValidationResult): ValidationResult {
  const rulesSkipped = result.rulesSkipped ?? 0;
  const rulesErrored = result.rulesErrored ?? 0;
  return {
    ...result,
    rulesSkipped,
    rulesErrored,
    rulesTotal: result.rulesTotal ?? result.rulesChecked + rulesSkipped + rulesErrored,
    skippedRuleIds: result.skippedRuleIds ?? [],
    erroredRuleIds: result.erroredRuleIds ?? [],
  };
}

function createComposableEngine() {
  return {
    execute: async (context: any): Promise<ComposableValidationResult> => {
      const { SdlcValidationMode } = require('@beyondnet/evolith-core-domain/application/validators/modes/sdlc-validation.mode');
      const { ArchitectureValidationMode } = require('@beyondnet/evolith-core-domain/application/validators/modes/architecture-validation.mode');
      const { RulesetValidationMode } = require('@beyondnet/evolith-core-domain/application/validators/modes/ruleset-validation.mode');
      const { AdrValidationMode } = require('@beyondnet/evolith-core-domain/application/validators/modes/adr-validation.mode');
      const { AdhocValidationMode } = require('@beyondnet/evolith-core-domain/application/validators/modes/adhoc-validation.mode');

      const modes = [
        new SdlcValidationMode(),
        new ArchitectureValidationMode(),
        new RulesetValidationMode(),
        new AdrValidationMode(),
        new AdhocValidationMode(),
      ];

      const resolvedModes = modes.filter((m: any) => m.canHandle(context));
      const modesToRun = resolvedModes.length > 0 ? resolvedModes : modes.filter((m: any) => m.name === 'ruleset');

      const modeResults: ModeValidationResult[] = [];
      for (const mode of modesToRun) {
        try {
          const result = await mode.validate(context);
          modeResults.push(result);
        } catch (error) {
          modeResults.push({
            mode: mode.name,
            status: 'failed',
            rulesChecked: 0,
            issues: [{
              ruleId: 'MODE_ERROR',
              status: 'fail',
              message: (error as Error).message,
              severity: 'error',
            }],
          });
        }
      }

      const totalRulesChecked = modeResults.reduce((sum: number, r: ModeValidationResult) => sum + r.rulesChecked, 0);
      // GT-569: a coverage number never travels without its denominator.
      const totalRulesSkipped = modeResults.reduce((sum: number, r: ModeValidationResult) => sum + (r.rulesSkipped ?? 0), 0);
      const totalRulesErrored = modeResults.reduce((sum: number, r: ModeValidationResult) => sum + (r.rulesErrored ?? 0), 0);
      const totalRulesTotal = modeResults.reduce(
        (sum: number, r: ModeValidationResult) =>
          sum + (r.rulesTotal ?? r.rulesChecked + (r.rulesSkipped ?? 0) + (r.rulesErrored ?? 0)),
        0,
      );
      const failedRules = modeResults.reduce(
        (sum: number, r: ModeValidationResult) => sum + r.issues.filter((i: ModeValidationIssue) => i.status === 'fail').length,
        0,
      );

      return {
        status: modeResults.some((r: ModeValidationResult) => r.status === 'failed') ? 'failed' : 'passed',
        modes: modeResults,
        totalRulesChecked,
        totalRulesSkipped,
        totalRulesErrored,
        totalRulesTotal,
        skippedRuleIds: modeResults.flatMap((r: ModeValidationResult) => r.skippedRuleIds ?? []),
        erroredRuleIds: modeResults.flatMap((r: ModeValidationResult) => r.erroredRuleIds ?? []),
        totalIssues: modeResults.reduce((sum: number, r: ModeValidationResult) => sum + r.issues.length, 0),
        passedRules: totalRulesChecked - failedRules,
        failedRules,
        performanceMs: 0,
      };
    },
  };
}

@Command({
  name: 'validate',
  description: 'Validate a satellite repository against Evolith rulesets, topology and SDLC phase gates',
})
export class ValidateCommand extends BaseEvolithCommand {
  constructor(
    private readonly useCase: ValidateSatelliteUseCase,
    private readonly validator: RulesetValidatorService,
    promptService: PromptService,
    configService?: ConfigService,
  ) {
    super('ValidateCommand', promptService, configService);
  }

  async executeCommand(passedParam: string[], options?: ValidateCommandOptions): Promise<void> {
    const json = (options?.format as string | undefined) === 'json';
    const startedAt = Date.now();
    const meta = {
      command: 'evolith validate',
      executedAt: new Date().toISOString(),
      durationMs: 0,
      correlationId: randomUUID(),
      schemaVersion: OUTPUT_ENVELOPE_SCHEMA_VERSION,
    };

    if (!json) {
      this.promptService.showIntro('Evolith SDK — Standards Validation');
    }

    // ADR-0109: unified satellite resolution — explicit --satellite →
    // nearest-ancestor evolith.yaml from cwd → profile.satellite → cwd.
    const satellite = resolveSatelliteDetailed({
      explicit: options?.satellite,
      profileSatellite: this.profile.satellite,
    });

    // GT-664 — the terminal `cwd` fallback is "nobody named a satellite": no
    // --satellite, no evolith.yaml anywhere above the working directory, no
    // profile. ADR-0109 keeps it so a command can report the absence itself,
    // and `validate` reports it HERE, before anything runs.
    //
    // It used to report it by validating the directory anyway. That was cheap
    // while every `enforce:` rule was inert; since the enforcer subsystem was
    // reconnected in this same gap, `validate` spawns external analysers over
    // the tree it was pointed at, and pointing them at an arbitrary working
    // directory is a repository-wide scan nobody asked for. The verdict it
    // produced was worthless anyway: 400-odd rules failing against a directory
    // that is not a satellite is not a governance finding.
    //
    // Exit 1 rather than 3, derived from the envelope code rather than asserted:
    // `NOT_A_SATELLITE` is already mapped in the GT-580 taxonomy as a tool
    // failure — the command could not reach a verdict — and it must not start
    // disagreeing with itself here.
    if (satellite.source === 'cwd') {
      const message =
        `No satellite to validate: ${satellite.path} declares no evolith.yaml, no ancestor ` +
        'directory does either, and no --satellite or profile satellite was given. ' +
        'Nothing was evaluated and nothing was scanned. Run from inside the satellite, ' +
        'pass --satellite <path>, or set one with `evolith config`.';
      if (json) {
        console.log(JSON.stringify(createErrorEnvelope('NOT_A_SATELLITE', message, { ...meta, durationMs: Date.now() - startedAt }), null, 2));
      } else {
        this.promptService.showError(message);
        this.promptService.showOutro('Validation aborted: no satellite found.');
      }
      exitWith(exitCodeForErrorCode('NOT_A_SATELLITE'));
    }
    const satellitePath = satellite.path;

    // GT-456: resolve the Core rulesets root so validation works from ANY satellite,
    // not just from inside the Core monorepo. Order: --core → EVOLITH_CORE_PATH →
    // profile.core → the rulesets bundled with the CLI. resolveRulesets() throws an
    // actionable error when an override has no src/rulesets or no bundled rulesets
    // can be located — surface it instead of silently checking 0 rules.
    const coreOverride = resolveCoreOverride({ explicit: options?.core, profileCore: this.profile.core });
    let corePath: string | undefined;
    try {
      corePath = resolveRulesets(coreOverride).coreRoot;
    } catch (err) {
      const message = (err as Error).message;
      // GT-485: in --format json mode an aborted validation must still emit an
      // ADR-0073 error envelope to stdout — previously it printed human text and
      // exited 1 with an empty stdout, breaking machine consumers.
      if (json) {
        console.log(JSON.stringify(createErrorEnvelope('RULESET_NOT_FOUND', message, { ...meta, durationMs: Date.now() - startedAt }), null, 2));
        process.exit(1);
      }
      this.promptService.showError(message);
      this.promptService.showOutro('Validation aborted.');
      // GT-474: an aborted validation must exit non-zero. Returning silently
      // exited 0, so CI read "resolved no rulesets" as a passing gate.
      process.exit(1);
    }

    if (!json) {
      this.promptService.startSpinner('Analyzing repository...');
    }

    let result: ValidationResult;
    let evaluationVerdict: any;
    let composableResult: ComposableValidationResult | undefined;

    try {
      const engine = options?.engine === 'opa' ? 'opa' : 'native';

      if (options?.composable || options?.adr || options?.file) {
        // GT-688 — the composable modes are SINGLE-topology by construction:
        // `architecture-validation.mode.ts` resolves exactly one
        // `topology.manifest.json` from `context.topology`. Rather than collapse a
        // composition to its first member in silence — the defect this row exists
        // to remove — the difference is stated and the run is refused.
        if ((options?.topology?.length ?? 0) > 1) {
          const message =
            `--composable/--adr/--file validate ONE topology at a time; got ${options!.topology!.length} ` +
            `(${options!.topology!.join(', ')}). These modes resolve a single topology manifest, so a ` +
            'composition cannot be honoured here. Re-run without --composable/--adr/--file for the ' +
            'composition, or pass a single -t.';
          if (json) {
            console.log(JSON.stringify(createErrorEnvelope('VALIDATION_FAILED', message, { ...meta, durationMs: Date.now() - startedAt }), null, 2));
          } else {
            this.promptService.showError(message);
          }
          // `process.exit` does NOT stop this function under test — every spec in this
          // suite stubs it — so without the `return` the refused run FALLS THROUGH into
          // the real composable validation. That is not a test-only cosmetic: it is why
          // `validate.topology-composition.spec.ts` timed out at 10s on the runner while
          // passing locally in milliseconds, the fall-through doing real work against a
          // corpus that a developer's tree has cached and a fresh checkout does not.
          process.exit(1);
          return;
        }
        const context = {
          satellitePath,
          corePath,
          engine: engine as 'native' | 'opa',
          // GT-701 — the composable modes used to receive `engine` and no way to
          // act on it: they parsed ruleset JSON and reported every rule it
          // contained as `pass`. This command already holds a real validator, so
          // the only thing missing was handing it over, built for the engine the
          // caller actually asked for.
          evaluator: this.validator
            ? rebuildValidatorForEngine(this.validator, engine as 'native' | 'opa')
            : undefined,
          topology: options?.topology?.[0],
          phase: options?.phase,
          rulesetId: options?.ruleset,
          adrId: options?.adr,
          filePath: options?.file,
        };

        const composableEngine = createComposableEngine();
        composableResult = await composableEngine.execute(context);

        result = {
          status: composableResult.status,
          rulesChecked: composableResult.totalRulesChecked,
          rulesSkipped: composableResult.totalRulesSkipped,
          rulesErrored: composableResult.totalRulesErrored,
          rulesTotal: composableResult.totalRulesTotal,
          skippedRuleIds: composableResult.skippedRuleIds,
          erroredRuleIds: composableResult.erroredRuleIds,
          issues: composableResult.modes.flatMap((m: ModeValidationResult) =>
            m.issues.map((i: ModeValidationIssue) => ({
              ruleId: i.ruleId,
              severity: (i.severity === 'error' ? 'MUST' : i.severity === 'warning' ? 'SHOULD' : 'COULD') as 'MUST' | 'SHOULD' | 'COULD',
              category: m.mode,
              title: i.message,
              description: i.message,
              blocking: i.severity === 'error',
              file: i.file,
              line: i.line,
            })),
          ),
          coreRef: { version: null, path: corePath ?? null },
          timestamp: new Date().toISOString(),
        };
      } else {
        const useManifest = options?.manifest || options?.phase || options?.topology?.length;
        if (useManifest) {
          const out = await (this.useCase as any).execute({
            satellitePath,
            corePath,
            engine,
            manifest: {
              satellitePath,
              corePath,
              // GT-688 — the SAME repeatable flag must mean the SAME thing on
              // both commands. Taking `[0]` here while `evaluate` sent the whole
              // array made `-t modular-monolith -t agentic-ai` put the nine
              // AAI-R rules in scope on `evaluate` and drop them on `validate`,
              // from one identical command line. `topology` stays the scalar
              // display envelope (its first member); `topologies` is what the
              // applicability filter reads.
              topology: options?.topology?.[0],
              ...(options?.topology?.length ? { topologies: options.topology } : {}),
              phase: options?.phase,
            },
          });
          result = out.result;
          evaluationVerdict = out.evaluationVerdict || null;
        } else if (options?.ruleset) {
          result = (await this.useCase.execute({
            satellitePath,
            corePath,
            rulesetId: options.ruleset,
            engine,
            maxSkippedFraction: options?.maxSkippedFraction,
          })).result;
        } else {
          result = (await this.useCase.execute({
            satellitePath,
            corePath,
            engine,
            // GT-659 — absent ⇒ undefined ⇒ the whole corpus. The empty array is
            // NOT passed as a selection: "the caller named nothing" and "the
            // caller named an empty set" must not collapse, or a typo in a flag
            // would evaluate zero rules and report a pass.
            //
            // GT-661 — the profile is consulted when the flag is absent, which
            // is the CLI doing the job the principle assigns it: the Core
            // proposes, the client configures and selects. `--select` still
            // wins when given, including to WIDEN a stored default — an
            // explicit argument is a deliberate act. `resolveSelection` keeps
            // the empty-vs-absent distinction on both paths.
            rulesetRefs: this.resolveSelection(options?.select),
            maxSkippedFraction: options?.maxSkippedFraction,
          })).result;
        }

        if (options?.architecture || options?.topology?.length) {
          const rawTopologies: string[] = options?.topology || [];

          // Canonical topology ids pass through (trimmed). `--arch` with no
          // topology validates the full progressive axis (level 'ALL').
          const topologies: string[] = rawTopologies.map((raw) => raw.trim());

          interface ArchResult {
            status: 'passed' | 'failed' | 'warning';
            levels: string[];
            rulesChecked: number;
            rulesSkipped?: number;
            rulesErrored?: number;
            rulesTotal?: number;
            skippedRuleIds?: string[];
            erroredRuleIds?: string[];
            issues: ValidationIssue[];
            timestamp: string;
          }

          const validatorOptions = {
            level: topologies.length === 0 ? 'ALL' : undefined,
            topologies
          };

          const archResult: ArchResult = await this.validator.validateArchitecture(satellitePath, corePath, validatorOptions);

          const allIssues = [...result.issues, ...archResult.issues];
          const blockingCount = allIssues.filter(i => i.blocking).length;

          // GT-569: merging two runs must merge their denominators too, or the
          // combined report would claim coverage it does not have.
          result = {
            status: blockingCount > 0 ? 'failed' : allIssues.length > 0 ? 'warning' : 'passed',
            rulesChecked: result.rulesChecked + archResult.rulesChecked,
            rulesSkipped: (result.rulesSkipped ?? 0) + (archResult.rulesSkipped ?? 0),
            rulesErrored: (result.rulesErrored ?? 0) + (archResult.rulesErrored ?? 0),
            rulesTotal:
              (result.rulesTotal ?? result.rulesChecked) +
              (archResult.rulesTotal ?? archResult.rulesChecked),
            skippedRuleIds: [...(result.skippedRuleIds ?? []), ...(archResult.skippedRuleIds ?? [])],
            erroredRuleIds: [...(result.erroredRuleIds ?? []), ...(archResult.erroredRuleIds ?? [])],
            issues: allIssues,
            coreRef: result.coreRef,
            timestamp: new Date().toISOString(),
          };
        }
      }
    } catch (error) {
      if (!json) {
        this.promptService.stopSpinner();
      }
      // GT-474: an unresolvable/empty ruleset corpus is fatal, not a warning.
      // Surface the actionable message and exit non-zero instead of letting a
      // zero-rule run be mistaken for a validation verdict.
      if (error instanceof RulesetsNotFoundError) {
        // GT-485: emit an ADR-0073 error envelope in json mode instead of an
        // empty stdout + exit 1.
        if (json) {
          console.log(JSON.stringify(createErrorEnvelope('RULESET_NOT_FOUND', error.message, { ...meta, durationMs: Date.now() - startedAt }), null, 2));
        } else {
          this.promptService.showError((error as Error).message);
          this.promptService.showOutro('❌ Validation aborted: no Core ruleset resolved.');
        }
        process.exit(1);
      }
      throw error;
    }

    if (!json) {
      this.promptService.stopSpinner();
    }

    // GT-456: reflect the resolved Core rulesets root in coreRef.path so the report
    // shows where rules came from (previously always null, even with a valid --core).
    if (result.coreRef && !result.coreRef.path && corePath) {
      result = { ...result, coreRef: { ...result.coreRef, path: corePath } };
    }

    // GT-452/GT-474: never sign off when zero Core rulesets were resolved. A
    // satellite must not receive a compliance verdict having executed nothing.
    // GT-452 first degraded this to `warning`, but an operator reads "warning" as
    // "it checked and mostly passed" — so a zero-rule run is a BLOCKING failure.
    // DiskRulesetRepository now throws before we get here; this stays as
    // defense-in-depth for any other path that yields an empty rule set.
    // Scope to the DEFAULT full validation: a targeted --ruleset/--adr/--file/
    // --topology/--phase/--manifest run legitimately reports "0 issues" (no
    // violations of that specific check) without incrementing rulesChecked.
    //
    // GT-662: `--select` belongs on that list, and the omission was not
    // theoretical — selecting the ISO/IEC 5055 pack on a machine without the
    // analyser installed produced `GOV-CORE-UNRESOLVED`, telling the operator to
    // pass `--core` when they already had. The Core had resolved perfectly: 406
    // rules in the corpus, 4 selected, 0 executed because the tool was absent.
    // A red pointing at the wrong file is worse than no red.
    //
    // The distinction is now checked rather than inferred. GT-661 published
    // `selection.corpusTotal`, so "the Core resolved nothing" and "the caller
    // narrowed to rules that did not run" are separable facts: a corpus of ZERO
    // is still a hard failure under any selection, which keeps GT-474's
    // guarantee intact.
    const targetedRun = Boolean(
      options?.ruleset || options?.adr || options?.file ||
      options?.topology?.length || options?.phase || options?.manifest,
    );
    const narrowedByCaller =
      result.selection?.source === 'caller' && (result.selection?.corpusTotal ?? 0) > 0;
    if (!targetedRun && !narrowedByCaller && result.rulesChecked === 0) {
      const unresolvedIssue: ValidationIssue = {
        ruleId: 'GOV-CORE-UNRESOLVED',
        severity: 'MUST',
        category: 'governance',
        title: 'No Core rulesets were resolved',
        description:
          'validate executed 0 rules — the Evolith Core rulesets could not be resolved. ' +
          'Pass --core <path> or set EVOLITH_CORE_PATH so governance rules actually run.',
        blocking: true,
      };
      result = {
        ...result,
        status: 'failed',
        issues: [...result.issues, unresolvedIssue],
      };
    }

    // GT-569: the verdict must report its own denominator on EVERY surface. A
    // producer that predates the coverage fields (e.g. the `--ruleset` branch of
    // the use case) still leaves them undefined, so normalise here — the CLI
    // never emits `rulesChecked` without `rulesSkipped`/`rulesErrored`/`rulesTotal`.
    result = withCoverageDenominator(result);

    const format = (options?.format as OutputFormat) || 'markdown';
    const formatter = new OutputFormatterService();

    if (json) {
      const output = JSON.stringify(createSuccessEnvelope(result, { ...meta, durationMs: Date.now() - startedAt }), null, 2);
      // --output routes the ADR-0073 envelope to a file instead of stdout so
      // machine consumers can capture the report; stdout stays the default sink.
      if (options?.output) {
        const fs = await import('fs-extra');
        const path = await import('path');
        const resolvedOutput = path.resolve(options.output);
        await fs.writeFile(resolvedOutput, output, 'utf-8');
        this.promptService.showSuccess(`Report written to ${options.output}`);
      } else {
        console.log(output);
      }
      // A negative governance verdict must exit non-zero so CI can gate on it,
      // mirroring `gate`/`phase` (envelope success=command-ran, exit=verdict).
      if (result.status === 'failed') exitWith(CLI_EXIT_CODES.BLOCKED);
      return;
    }

    if (format === 'table' || format === 'yaml' || format === 'markdown') {
      const tableData = {
        status: result.status,
        rulesChecked: result.rulesChecked,
        rulesSkipped: result.rulesSkipped,
        rulesErrored: result.rulesErrored,
        rulesTotal: result.rulesTotal,
        issues: result.issues.map(i => ({
          ruleId: i.ruleId,
          severity: i.severity,
          category: i.category,
          title: i.title,
          blocking: i.blocking ? 'YES' : 'no',
        })),
        // GT-661 — the scope travels with the counts on THIS surface too.
        // Without it a table showing 85 blocking issues reads the same whether
        // the tenant selected those rules or the Core evaluated all 402 of its
        // own opinions, and those are different facts.
        selection: result.selection,
        coreRef: result.coreRef,
        timestamp: result.timestamp,
      };
      const output = formatter.format(tableData, { format, colors: true });
      if (options?.output) {
        const fs = await import('fs-extra');
        const path = await import('path');
        const resolvedOutput = path.resolve(options.output);
        await fs.writeFile(resolvedOutput, output, 'utf-8');
        this.promptService.showSuccess(`Report written to ${options.output}`);
      } else {
        console.log(output);
      }
    } else {
      this.printHumanReport(result);
    }

    if (composableResult) {
      this.promptService.showInfo(`\nComposable engine GT-312 — ${composableResult.status === 'passed' ? 'PASSED' : composableResult.status === 'failed' ? 'FAILED' : 'WARNINGS'}`);
      this.promptService.showInfo(`Modos ejecutados: ${composableResult.modes.map((m: ModeValidationResult) => m.mode).join(', ')}`);
      this.promptService.showInfo(
        `Rules: ${composableResult.totalRulesChecked} checked, ${composableResult.failedRules} failed, ` +
        `${composableResult.totalRulesSkipped} skipped, ${composableResult.totalRulesErrored} errored, ` +
        `${composableResult.totalRulesTotal} en total`,
      );
      this.promptService.showInfo(`Rendimiento: ${composableResult.performanceMs}ms`);

      for (const mode of composableResult.modes) {
        const failedIssues = mode.issues.filter((i: ModeValidationIssue) => i.status === 'fail');
        if (failedIssues.length > 0) {
          this.promptService.showWarning(`  Mode ${mode.mode}: ${failedIssues.length} failures`);
          for (const issue of failedIssues) {
            const icon = issue.severity === 'error' ? 'RED' : issue.severity === 'warning' ? 'YELLOW' : 'BLUE';
            this.promptService.showWarning(`    [${icon}] [${issue.ruleId}] ${issue.message}`);
            if (issue.remediation) {
              this.promptService.showInfo(`       Remedio: ${issue.remediation}`);
            }
          }
        }
        const passedIssues = mode.issues.filter((i: ModeValidationIssue) => i.status === 'pass');
        if (passedIssues.length > 0 && format !== 'json') {
          this.promptService.showInfo(`  Mode ${mode.mode}: ${passedIssues.length} rules OK`);
        }
      }
    } else if (evaluationVerdict) {
      const maxRemediationWidth = 72;
      const truncate = (s: string) => s.length > maxRemediationWidth ? s.slice(0, maxRemediationWidth) + '...' : s;

      this.promptService.showInfo(`\nEvaluation pipeline — ${evaluationVerdict.passed ? 'PASSED' : 'FAILED'}`);
      this.promptService.showInfo(`Topologia: ${evaluationVerdict.resolvedTopology || 'no detectada'}`);
      this.promptService.showInfo(`Gates: ${evaluationVerdict.summary.passedGates} / ${evaluationVerdict.summary.failedGates} / ${evaluationVerdict.summary.totalGates} total`);
      this.promptService.showInfo(`Rules: ${evaluationVerdict.summary.totalRules} checked, ${evaluationVerdict.summary.failedRules} failed`);
      for (const gate of evaluationVerdict.gates) {
        const failedEvals = gate.artifactEvaluations.filter((e: any) => !e.passed);
        if (failedEvals.length > 0) {
          this.promptService.showWarning(`  Gate ${gate.gateName} (${gate.gateId}): ${failedEvals.length} failures`);
          for (const ev of failedEvals) {
            const icon = ev.severity === 'error' ? 'RED' : ev.severity === 'warning' ? 'YELLOW' : 'BLUE';
            this.promptService.showWarning(`    [${icon}] [${ev.ruleId}] ${ev.artifact}`);
            this.promptService.showWarning(`       Mensaje: ${ev.message}`);
            if (ev.remediation) {
              this.promptService.showInfo(`       Remedio:  ${truncate(ev.remediation)}`);
            }
            this.promptService.showInfo(`       Severity: ${ev.severity} | Gate: ${ev.gateRef} | Rule: ${ev.rulePath}`);
          }
        }
        const passedEvals = gate.artifactEvaluations.filter((e: any) => e.passed);
        if (passedEvals.length > 0 && format !== 'json') {
          this.promptService.showInfo(`  Gate ${gate.gateName}: ${passedEvals.length} artifactos OK`);
        }
      }
    }

    if (result.status === 'failed') {
      this.promptService.showOutro('❌ Validation failed. See the errors above.');
      exitWith(CLI_EXIT_CODES.BLOCKED);
    } else if (result.status === 'warning') {
      this.promptService.showOutro('⚠️ Validation finished with warnings.');
    } else {
      this.promptService.showOutro('✅ The repository meets every Evolith standard.');
    }
  }

  private printHumanReport(result: ValidationResult): void {
    if (result.issues.length === 0) {
      this.promptService.showSuccess('No issues found.');
      // GT-569: "no issues" is NOT "everything was checked". The denominator is
      // printed even on the clean path, so a green can never hide 0/379.
      this.printCoverage(result);
      return;
    }

    const blocking = result.issues.filter(i => i.blocking);
    const warnings = result.issues.filter(i => !i.blocking);

    if (blocking.length > 0) {
      this.promptService.showError(`\n${blocking.length} blocking error(s):`);
      for (const issue of blocking) {
        this.promptService.showError(`  [${issue.ruleId}] ${issue.title}`);
        this.promptService.showError(`    ${issue.description}`);
        if (issue.file) {
          this.promptService.showError(`    File: ${issue.file}`);
        }
      }
    }

    if (warnings.length > 0) {
      this.promptService.showWarning(`\n${warnings.length} warning(s):`);
      for (const issue of warnings) {
        this.promptService.showWarning(`  [${issue.ruleId}] ${issue.title}`);
        this.promptService.showWarning(`    ${issue.description}`);
      }
    }

    this.printCoverage(result);
    if (result.coreRef.version) {
      this.promptService.showInfo(`Pinned Core version: ${result.coreRef.version}`);
    }
  }

  /**
   * GT-569 — checked / skipped / errored / total, always together.
   * A skipped rule has an UNKNOWN outcome, not a passing one, and a rule whose
   * handler threw (`errored`) is an engine defect that must never read as green.
   */
  private printCoverage(result: ValidationResult): void {
    const checked = result.rulesChecked;
    const skipped = result.rulesSkipped ?? 0;
    const errored = result.rulesErrored ?? 0;
    const total = result.rulesTotal ?? checked + skipped + errored;

    this.promptService.showInfo(
      `\nRules: ${checked} checked / ${skipped} skipped / ${errored} errored / ${total} total`,
    );

    // GT-661 — the SCOPE, next to the counts, because the human reader is the
    // one who most needs to tell "the pack I adopted failed" from "the Core
    // evaluated all of its opinions and something failed". Both render the same
    // red without this line.
    const selection = result.selection;
    if (selection?.source === 'caller') {
      this.promptService.showInfo(
        `Scope: caller selection — ${selection.rulesSelected} of ${selection.corpusTotal} rule(s), ` +
        `ruleset(s): ${selection.matched.join(', ') || 'none'}`,
      );
      if (selection.unmatched.length > 0) {
        this.promptService.showError(
          `  ${selection.unmatched.length} ruleset(s) requested that this Core does NOT carry: ${selection.unmatched.join(', ')}. ` +
          'Nothing was evaluated against them — this report says nothing about them. See `evolith rulesets`.',
        );
      }
    } else if (selection) {
      this.promptService.showInfo(
        `Scope: no selection — the whole corpus was evaluated (${selection.corpusTotal} rule(s)), which is this ` +
        "Core's PROPOSAL, not a tenant choice. Set `select` in the profile or pass " +
        '`--select` to narrow it; `evolith rulesets` lists what is available.',
      );
    }
    if (skipped > 0) {
      this.promptService.showWarning(
        `  ${skipped} rule(s) were NOT evaluated — their result is UNKNOWN, not passed.`,
      );
    }
    if (errored > 0) {
      this.promptService.showError(
        `  ${errored} rule(s) FAILED TO RUN (evaluator error): ${(result.erroredRuleIds ?? []).join(', ')}`,
      );
    }
  }

  @Option({
    flags: '-f, --format [string]',
    description: 'Output format (json, table, yaml, markdown)',
  })
  parseFormat(val: string): string {
    return val;
  }

  @Option({
    flags: '-o, --output [string]',
    description: 'Path to write the JSON report to',
  })
  parseOutput(val: string): string {
    return val;
  }

  @Option({
    flags: '-s, --satellite [path]',
    description: 'Path to the satellite repository (default: cwd)',
  })
  parseSatellite(val: string): string {
    return val;
  }

  @Option({
    flags: '-c, --core [path]',
    description: 'Path to the Evolith Core repository (default: auto-detect)',
  })
  parseCore(val: string): string {
    return val;
  }

  /**
   * GT-661 — the refs this run should be scoped to, flag first, profile second.
   *
   * Returns `undefined` for "the caller named nothing", which the engine turns
   * into the whole corpus and reports as `selection.source: 'core-default'`.
   * Every blank entry is dropped on BOTH paths: a profile carrying `select: []`
   * or `select: ['  ']` means the tenant configured nothing, never that it
   * configured an empty scope — the latter would evaluate zero rules, find zero
   * violations and report a pass over a repository nobody examined.
   */
  private resolveSelection(fromFlag?: string[]): string[] | undefined {
    const clean = (refs?: string[]): string[] =>
      (refs ?? []).map((r) => String(r ?? '').trim()).filter((r) => r !== '');

    const flag = clean(fromFlag);
    if (flag.length) return flag;

    const configured = clean(this.profile.select);
    return configured.length ? configured : undefined;
  }

  /**
   * GT-659 — select by the ref the CATALOGUE publishes, repeatably.
   *
   * `--ruleset` above resolves fifteen hand-written aliases through
   * RULESET_ID_MAP down a separate path; it cannot name a ruleset the reference
   * catalogue advertises, and a new pack is invisible to it until somebody edits
   * that map. This one takes the `$id` (or its corpus-relative path) exactly as
   * `GET /api/v1/reference/rulesets` publishes it, so what a client can ask for
   * is what the Core says it has.
   *
   * A ref that matches nothing does NOT quietly evaluate zero rules: the Core
   * reports it and the verdict blocks.
   */
  @Option({
    flags: '--select <ref>',
    description:
      'Evaluate ONLY the named ruleset(s), by the ref `evolith rulesets` ' +
      'publishes (repeatable). Absent ⇒ the tenant profile\u0027s `select` is used; ' +
      'with neither, the whole corpus, reported as ' +
      '`selection.source: core-default`.',
  })
  parseSelect(val: string, previous: string[] = []): string[] {
    return [...previous, val];
  }

  @Option({
    flags: '-r, --ruleset [id]',
    description: 'Validate a specific ruleset (adr-0002, acl, open-core, inheritance, cli-release, cli-parity, evidence, mcp, observability)',
  })
  parseRuleset(val: string): string {
    return val;
  }

  @Option({
    flags: '-a, --arch',
    description: 'Validate architecture across the whole progressive axis (equivalent to the three progressive topologies)',
  })
  parseArchitecture(): boolean {
    return true;
  }

  @Option({
    flags: '-t, --topology [id]',
    description:
      'Canonical topology to validate (repeatable): modular-monolith, distributed-modules, ' +
      'microservices, serverless, edge-computing, event-driven, data-mesh, agentic-ai.',
  })
  parseTopology(val: string, acc?: string[]): string[] {
    const list = acc || [];
    list.push(val);
    return list;
  }

  @Option({
    flags: '-e, --engine [engine]',
    description: 'Validation engine to use: native (default) or opa',
  })
  parseEngine(val: string): string {
    return val;
  }

  /**
   * GT-676 — the coverage floor `GT-569` built and no surface could switch on.
   *
   * Fractions, not percentages, because that is the unit the engine already
   * computes and publishes; accepting `20` for 20% would silently mean "never
   * fail" (a fraction can never exceed 1) which is the wrong direction to be
   * wrong in for a gate.
   */
  @Option({
    flags: '--max-skipped-fraction <fraction>',
    description:
      'Coverage floor: fail if the fraction of applicable rules NOT evaluated exceeds this value (0..1). '
      + 'Without the flag no floor is applied.',
  })
  parseMaxSkippedFraction(val: string): number {
    const parsed = Number(val);
    if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1) {
      // Refusing beats silently disabling the gate: a caller who typed `20`
      // meaning 20% would otherwise get a threshold nothing can exceed.
      throw new Error(`--max-skipped-fraction must be a number between 0 and 1; got '${val}'`);
    }
    return parsed;
  }

  @Option({
    flags: '-m, --manifest [path]',
    description: 'Path to the SatelliteManifest JSON for end-to-end evaluation (enables the GT-281 pipeline)',
  })
  parseManifest(val: string): string {
    return val;
  }

  @Option({
    flags: '-p, --phase [phase]',
    description: 'Fase SDLC a evaluar: discovery, design, construction, qa, release. Activa pipeline GT-281',
  })
  parsePhase(val: string): string {
    return val;
  }

  @Option({
    flags: '--adr [id]',
    description: 'Validate against specific ADR rules (adr-0002, adr-0005, adr-0010, adr-0018, adr-0032, adr-0040, adr-0050)',
  })
  parseAdr(val: string): string {
    return val;
  }

  @Option({
    flags: '--file [path]',
    description: 'Validate a single file (ad-hoc mode)',
  })
  parseFile(val: string): string {
    return val;
  }

  @Option({
    flags: '--composable',
    description: 'Use the composable validation engine (GT-312) with smart mode resolution',
  })
  parseComposable(): boolean {
    return true;
  }
}
