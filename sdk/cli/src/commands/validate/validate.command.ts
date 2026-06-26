import { Command, Option } from 'nest-commander';
import { ValidateSatelliteUseCase } from '@evolith/core-domain/application/use-cases/validate-satellite.use-case';
import { ValidationResult, ValidationIssue, RulesetValidatorService } from '@evolith/core-domain/application/validators/ruleset-validator.service';
import { OutputFormatterService, OutputFormat } from '../../infrastructure/formatters/output-formatter.service';
import { BaseEvolithCommand } from '../../infrastructure/cli/base-command';
import { PromptService } from '../../infrastructure/prompts/prompt.service';
import { ConfigService } from '../../infrastructure/config/config.service';

interface ValidateCommandOptions {
  format?: string;
  output?: string;
  satellite?: string;
  core?: string;
  ruleset?: string;
  architecture?: boolean;
  archLevel?: string;
  topology?: string[];
  engine?: string;
  manifest?: string;
  phase?: string;
}

@Command({
  name: 'validate',
  description: 'Verifica que el repositorio satélite cumpla los estándares mínimos de Evolith',
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
    this.promptService.showIntro('Evolith SDK - Validación de Estándares');

    const satellitePath = options?.satellite || this.profile.satellite || process.cwd();
    const corePath = options?.core || this.profile.core || undefined;

    this.promptService.startSpinner('Analizando repositorio...');

    let result: ValidationResult;
    let evaluationVerdict: any;

    try {
      const engine = options?.engine === 'opa' ? 'opa' : 'native';

      // If manifest or phase is provided, run the end-to-end pipeline
      const useManifest = options?.manifest || options?.phase || options?.topology?.length;
      if (useManifest) {
        const out = await this.useCase.execute({
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
        evaluationVerdict = out.evaluationVerdict;
      } else if (options?.ruleset) {
        result = (await this.useCase.execute({
          satellitePath,
          corePath,
          rulesetId: options.ruleset,
          engine
        })).result;
      } else {
        result = (await this.useCase.execute({ satellitePath, corePath, engine })).result;
      }

      if (options?.architecture || options?.topology?.length) {
        const topologies: string[] = options?.topology || [];
        const archLevel = options?.archLevel;

        if (archLevel) {
          this.promptService.showWarning(`⚠️ El parámetro --arch-level está deprecado. Use --topology en su lugar.`);
          if (archLevel === 'F1') topologies.push('modular-monolith');
          else if (archLevel === 'F2') topologies.push('distributed-modules');
          else if (archLevel === 'F3') topologies.push('microservices');
        }

        interface ArchResult {
          status: 'passed' | 'failed' | 'warning';
          levels: string[];
          rulesChecked: number;
          issues: ValidationIssue[];
          timestamp: string;
        }

        const validatorOptions = {
          level: archLevel || (topologies.length === 0 ? 'ALL' : undefined),
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
    } catch (error) {
      this.promptService.stopSpinner();
      throw error;
    }

    this.promptService.stopSpinner();

    const format = (options?.format as OutputFormat) || 'markdown';
    const formatter = new OutputFormatterService();

    if (format === 'json') {
      const output = JSON.stringify(result, null, 2);
      if (options?.output) {
        const fs = await import('fs-extra');
        await fs.writeFile(options.output, output, 'utf-8');
        this.promptService.showSuccess(`Reporte guardado en ${options.output}`);
      } else {
        console.log(output);
      }
    } else if (format === 'table' || format === 'yaml' || format === 'markdown') {
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
        await fs.writeFile(options.output, output, 'utf-8');
        this.promptService.showSuccess(`Reporte guardado en ${options.output}`);
      } else {
        console.log(output);
      }
    } else {
      this.printHumanReport(result);
    }

    if (evaluationVerdict) {
      const maxRemediationWidth = 72;
      const truncate = (s: string) => s.length > maxRemediationWidth ? s.slice(0, maxRemediationWidth) + '…' : s;

      this.promptService.showInfo(`\nPipeline de evaluación — ${evaluationVerdict.passed ? '✅ PASÓ' : '❌ FALLÓ'}`);
      this.promptService.showInfo(`Topología: ${evaluationVerdict.resolvedTopology || 'no detectada'}`);
      this.promptService.showInfo(`Gates: ${evaluationVerdict.summary.passedGates}✓ / ${evaluationVerdict.summary.failedGates}✗ / ${evaluationVerdict.summary.totalGates} total`);
      this.promptService.showInfo(`Reglas: ${evaluationVerdict.summary.totalRules} verificadas, ${evaluationVerdict.summary.failedRules} fallaron`);
      for (const gate of evaluationVerdict.gates) {
        const failedEvals = gate.artifactEvaluations.filter(e => !e.passed);
        if (failedEvals.length > 0) {
          this.promptService.showWarning(`  Gate ${gate.gateName} (${gate.gateId}): ${failedEvals.length} fallos`);
          for (const ev of failedEvals) {
            const icon = ev.severity === 'error' ? '🔴' : ev.severity === 'warning' ? '🟡' : '🔵';
            this.promptService.showWarning(`    ${icon} [${ev.ruleId}] ${ev.artifact}`);
            this.promptService.showWarning(`       Mensaje: ${ev.message}`);
            if (ev.remediation) {
              this.promptService.showInfo(`       Remedio:  ${truncate(ev.remediation)}`);
            }
            this.promptService.showInfo(`       Severidad: ${ev.severity} | Gate: ${ev.gateRef} | Regla: ${ev.rulePath}`);
          }
        }
        const passedEvals = gate.artifactEvaluations.filter(e => e.passed);
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
    description: 'Incluir validación de arquitectura F1/F2/F3 (Deprecated: use --topology)',
  })
  parseArchitecture(): boolean {
    return true;
  }

  @Option({
    flags: '-l, --arch-level [level]',
    description: 'Nivel de arquitectura: F1, F2, F3, ALL (Deprecated: use --topology)',
  })
  parseArchLevel(val: string): string {
    return val;
  }

  @Option({
    flags: '-t, --topology [id]',
    description: 'Topología a validar (se puede usar múltiples veces)',
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
    description: 'Fase SDLC a evaluar (f1, f2, f3, f4, f5). Activa pipeline GT-281',
  })
  parsePhase(val: string): string {
    return val;
  }
}
