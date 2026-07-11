import { Command, Option } from 'nest-commander';
import { randomUUID } from 'node:crypto';
import { ValidateSatelliteUseCase } from '@beyondnet/evolith-core-domain/application/use-cases/validate-satellite.use-case';
import { ValidationResult, ValidationIssue, RulesetValidatorService } from '@beyondnet/evolith-core-domain/application/validators/ruleset-validator.service';
import { RulesetsNotFoundError } from '@beyondnet/evolith-core-domain/domain/ports/ruleset-repository.port';
import { OutputFormatterService, OutputFormat } from '../../infrastructure/formatters/output-formatter.service';
import { resolveRulesets } from '../../infrastructure/paths/rulesets-resolver';
import { resolveSatellitePath } from '../../infrastructure/paths/satellite-resolver';
import { BaseEvolithCommand } from '../../infrastructure/cli/base-command';
import { PromptService } from '../../infrastructure/prompts/prompt.service';
import { ConfigService } from '../../infrastructure/config/config.service';
import {
  createSuccessEnvelope,
  createErrorEnvelope,
  OUTPUT_ENVELOPE_SCHEMA_VERSION,
} from '@beyondnet/evolith-core-domain/domain/gate-evidence';

interface ValidateCommandOptions {
  format?: string;
  output?: string;
  satellite?: string;
  core?: string;
  ruleset?: string;
  architecture?: boolean;
  topology?: string[];
  engine?: string;
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
  totalIssues: number;
  passedRules: number;
  failedRules: number;
  performanceMs: number;
}

interface ModeValidationResult {
  mode: string;
  status: string;
  rulesChecked: number;
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
      const failedRules = modeResults.reduce(
        (sum: number, r: ModeValidationResult) => sum + r.issues.filter((i: ModeValidationIssue) => i.status === 'fail').length,
        0,
      );

      return {
        status: modeResults.some((r: ModeValidationResult) => r.status === 'failed') ? 'failed' : 'passed',
        modes: modeResults,
        totalRulesChecked,
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
      this.promptService.showIntro('Evolith SDK - Validación de Estándares');
    }

    // ADR-0109: unified satellite resolution — explicit --satellite →
    // nearest-ancestor evolith.yaml from cwd → profile.satellite → cwd.
    const satellitePath = resolveSatellitePath({
      explicit: options?.satellite,
      profileSatellite: this.profile.satellite,
    });

    // GT-456: resolve the Core rulesets root so validation works from ANY satellite,
    // not just from inside the Core monorepo. Order: --core → EVOLITH_CORE_PATH →
    // profile.core → the rulesets bundled with the CLI. resolveRulesets() throws an
    // actionable error when an override has no src/rulesets or no bundled rulesets
    // can be located — surface it instead of silently checking 0 rules.
    const coreOverride = options?.core || process.env.EVOLITH_CORE_PATH || this.profile.core;
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
      this.promptService.showOutro('Validación abortada.');
      // GT-474: an aborted validation must exit non-zero. Returning silently
      // exited 0, so CI read "resolved no rulesets" as a passing gate.
      process.exit(1);
    }

    if (!json) {
      this.promptService.startSpinner('Analizando repositorio...');
    }

    let result: ValidationResult;
    let evaluationVerdict: any;
    let composableResult: ComposableValidationResult | undefined;

    try {
      const engine = options?.engine === 'opa' ? 'opa' : 'native';

      if (options?.composable || options?.adr || options?.file) {
        const context = {
          satellitePath,
          corePath,
          engine: engine as 'native' | 'opa',
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
              topology: options?.topology?.[0],
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
          })).result;
        } else {
          result = (await this.useCase.execute({ satellitePath, corePath, engine })).result;
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

          result = {
            status: blockingCount > 0 ? 'failed' : allIssues.length > 0 ? 'warning' : 'passed',
            rulesChecked: result.rulesChecked + archResult.rulesChecked,
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
          this.promptService.showOutro('❌ Validación abortada: no se resolvió ningún ruleset del Core.');
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
    const targetedRun = Boolean(
      options?.ruleset || options?.adr || options?.file ||
      options?.topology?.length || options?.phase || options?.manifest,
    );
    if (!targetedRun && result.rulesChecked === 0) {
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
        this.promptService.showSuccess(`Reporte guardado en ${options.output}`);
      } else {
        console.log(output);
      }
      // A negative governance verdict must exit non-zero so CI can gate on it,
      // mirroring `gate`/`phase` (envelope success=command-ran, exit=verdict).
      if (result.status === 'failed') process.exit(1);
      return;
    }

    if (format === 'table' || format === 'yaml' || format === 'markdown') {
      const tableData = {
        status: result.status,
        rulesChecked: result.rulesChecked,
        issues: result.issues.map(i => ({
          ruleId: i.ruleId,
          severity: i.severity,
          category: i.category,
          title: i.title,
          blocking: i.blocking ? 'YES' : 'no',
        })),
        coreRef: result.coreRef,
        timestamp: result.timestamp,
      };
      const output = formatter.format(tableData, { format, colors: true });
      if (options?.output) {
        const fs = await import('fs-extra');
        const path = await import('path');
        const resolvedOutput = path.resolve(options.output);
        await fs.writeFile(resolvedOutput, output, 'utf-8');
        this.promptService.showSuccess(`Reporte guardado en ${options.output}`);
      } else {
        console.log(output);
      }
    } else {
      this.printHumanReport(result);
    }

    if (composableResult) {
      this.promptService.showInfo(`\nMotor Composable GT-312 — ${composableResult.status === 'passed' ? 'PASO' : composableResult.status === 'failed' ? 'FALLO' : 'ADVERTENCIAS'}`);
      this.promptService.showInfo(`Modos ejecutados: ${composableResult.modes.map((m: ModeValidationResult) => m.mode).join(', ')}`);
      this.promptService.showInfo(`Reglas: ${composableResult.totalRulesChecked} verificadas, ${composableResult.failedRules} fallaron`);
      this.promptService.showInfo(`Rendimiento: ${composableResult.performanceMs}ms`);

      for (const mode of composableResult.modes) {
        const failedIssues = mode.issues.filter((i: ModeValidationIssue) => i.status === 'fail');
        if (failedIssues.length > 0) {
          this.promptService.showWarning(`  Modo ${mode.mode}: ${failedIssues.length} fallos`);
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
          this.promptService.showInfo(`  Modo ${mode.mode}: ${passedIssues.length} reglas OK`);
        }
      }
    } else if (evaluationVerdict) {
      const maxRemediationWidth = 72;
      const truncate = (s: string) => s.length > maxRemediationWidth ? s.slice(0, maxRemediationWidth) + '...' : s;

      this.promptService.showInfo(`\nPipeline de evaluacion — ${evaluationVerdict.passed ? 'PASO' : 'FALLO'}`);
      this.promptService.showInfo(`Topologia: ${evaluationVerdict.resolvedTopology || 'no detectada'}`);
      this.promptService.showInfo(`Gates: ${evaluationVerdict.summary.passedGates} / ${evaluationVerdict.summary.failedGates} / ${evaluationVerdict.summary.totalGates} total`);
      this.promptService.showInfo(`Reglas: ${evaluationVerdict.summary.totalRules} verificadas, ${evaluationVerdict.summary.failedRules} fallaron`);
      for (const gate of evaluationVerdict.gates) {
        const failedEvals = gate.artifactEvaluations.filter((e: any) => !e.passed);
        if (failedEvals.length > 0) {
          this.promptService.showWarning(`  Gate ${gate.gateName} (${gate.gateId}): ${failedEvals.length} fallos`);
          for (const ev of failedEvals) {
            const icon = ev.severity === 'error' ? 'RED' : ev.severity === 'warning' ? 'YELLOW' : 'BLUE';
            this.promptService.showWarning(`    [${icon}] [${ev.ruleId}] ${ev.artifact}`);
            this.promptService.showWarning(`       Mensaje: ${ev.message}`);
            if (ev.remediation) {
              this.promptService.showInfo(`       Remedio:  ${truncate(ev.remediation)}`);
            }
            this.promptService.showInfo(`       Severidad: ${ev.severity} | Gate: ${ev.gateRef} | Regla: ${ev.rulePath}`);
          }
        }
        const passedEvals = gate.artifactEvaluations.filter((e: any) => e.passed);
        if (passedEvals.length > 0 && format !== 'json') {
          this.promptService.showInfo(`  Gate ${gate.gateName}: ${passedEvals.length} artifactos OK`);
        }
      }
    }

    if (result.status === 'failed') {
      this.promptService.showOutro('❌ La validación ha fallado. Revise los errores arriba.');
      process.exit(1);
    } else if (result.status === 'warning') {
      this.promptService.showOutro('⚠️ La validación ha terminado con advertencias.');
    } else {
      this.promptService.showOutro('✅ El repositorio cumple con todos los estándares de Evolith.');
    }
  }

  private printHumanReport(result: ValidationResult): void {
    if (result.issues.length === 0) {
      this.promptService.showSuccess('No se encontraron problemas.');
      return;
    }

    const blocking = result.issues.filter(i => i.blocking);
    const warnings = result.issues.filter(i => !i.blocking);

    if (blocking.length > 0) {
      this.promptService.showError(`\\n${blocking.length} error(es) bloqueante(s):`);
      for (const issue of blocking) {
        this.promptService.showError(`  [${issue.ruleId}] ${issue.title}`);
        this.promptService.showError(`    ${issue.description}`);
        if (issue.file) {
          this.promptService.showError(`    Archivo: ${issue.file}`);
        }
      }
    }

    if (warnings.length > 0) {
      this.promptService.showWarning(`\\n${warnings.length} advertencia(es):`);
      for (const issue of warnings) {
        this.promptService.showWarning(`  [${issue.ruleId}] ${issue.title}`);
        this.promptService.showWarning(`    ${issue.description}`);
      }
    }

    this.promptService.showInfo(`\\nReglas verificadas: ${result.rulesChecked}`);
    if (result.coreRef.version) {
      this.promptService.showInfo(`Core version pinneada: ${result.coreRef.version}`);
    }
  }

  @Option({
    flags: '-f, --format [string]',
    description: 'Formato de salida (json, table, yaml, markdown)',
  })
  parseFormat(val: string): string {
    return val;
  }

  @Option({
    flags: '-o, --output [string]',
    description: 'Ruta para guardar el reporte JSON',
  })
  parseOutput(val: string): string {
    return val;
  }

  @Option({
    flags: '-s, --satellite [path]',
    description: 'Ruta al repositorio satélite (default: cwd)',
  })
  parseSatellite(val: string): string {
    return val;
  }

  @Option({
    flags: '-c, --core [path]',
    description: 'Ruta al repositorio Evolith Core (default: auto-detect)',
  })
  parseCore(val: string): string {
    return val;
  }

  @Option({
    flags: '-r, --ruleset [id]',
    description: 'Validar ruleset específico (adr-0002, acl, open-core, inheritance, cli-release, cli-parity, evidence, mcp, observability)',
  })
  parseRuleset(val: string): string {
    return val;
  }

  @Option({
    flags: '-a, --arch',
    description: 'Validar arquitectura sobre todo el eje progresivo (equivale a las tres topologías progresivas)',
  })
  parseArchitecture(): boolean {
    return true;
  }

  @Option({
    flags: '-t, --topology [id]',
    description:
      'Topología canónica a validar (repetible): modular-monolith, distributed-modules, ' +
      'microservices, serverless, edge-computing, event-driven, data-mesh, agentic-ai.',
  })
  parseTopology(val: string, acc?: string[]): string[] {
    const list = acc || [];
    list.push(val);
    return list;
  }

  @Option({
    flags: '-e, --engine [engine]',
    description: 'Motor de validación a utilizar: native (por defecto) u opa',
  })
  parseEngine(val: string): string {
    return val;
  }

  @Option({
    flags: '-m, --manifest [path]',
    description: 'Ruta al SatelliteManifest JSON para evaluación end-to-end (activa pipeline GT-281)',
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
    description: 'Validar contra reglas ADR específicas (adr-0002, adr-0005, adr-0010, adr-0018, adr-0032, adr-0040, adr-0050)',
  })
  parseAdr(val: string): string {
    return val;
  }

  @Option({
    flags: '--file [path]',
    description: 'Validar archivo individual (modo ad-hoc)',
  })
  parseFile(val: string): string {
    return val;
  }

  @Option({
    flags: '--composable',
    description: 'Usar motor de validación composable (GT-312) con resolución inteligente de modos',
  })
  parseComposable(): boolean {
    return true;
  }
}
