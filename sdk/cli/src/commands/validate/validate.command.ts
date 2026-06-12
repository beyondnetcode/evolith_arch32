import { Command, Option } from 'nest-commander';
import { ValidateSatelliteUseCase } from '../../application/use-cases/validate-satellite.use-case';
import { ValidationResult, ValidationIssue, RulesetValidatorService } from '../../application/validators/ruleset-validator.service';
import { OutputFormatterService, OutputFormat } from '../../infrastructure/formatters/output-formatter.service';
import { BaseEvolithCommand } from '../../infrastructure/cli/base-command';
import { PromptService } from '../../infrastructure/prompts/prompt.service';

interface ValidateCommandOptions {
  format?: string;
  output?: string;
  satellite?: string;
  core?: string;
  ruleset?: string;
  architecture?: boolean;
  archLevel?: string;
  engine?: string;
}

@Command({
  name: 'validate',
  description: 'Verifica que el repositorio satélite cumpla los estándares mínimos de Evolith',
})
export class ValidateCommand extends BaseEvolithCommand {
  constructor(
    private readonly useCase: ValidateSatelliteUseCase,
    private readonly validator: RulesetValidatorService,
    promptService: PromptService
  ) {
    super('ValidateCommand', promptService);
  }

  async executeCommand(passedParam: string[], options?: ValidateCommandOptions): Promise<void> {
    this.promptService.showIntro('Evolith SDK - Validación de Estándares');

    const satellitePath = options?.satellite || process.cwd();
    const corePath = options?.core || undefined;

    this.promptService.startSpinner('Analizando repositorio...');

    let result: ValidationResult;

    try {
      const engine = options?.engine === 'opa' ? 'opa' : 'native';

      if (options?.ruleset) {
        result = (await this.useCase.execute({
          satellitePath,
          corePath,
          rulesetId: options.ruleset,
          engine
        })).result;
      } else {
        result = (await this.useCase.execute({ satellitePath, corePath, engine })).result;
      }

      if (options?.architecture) {
        const archLevel = (options?.archLevel as 'F1' | 'F2' | 'F3' | 'ALL') || 'ALL';

        interface ArchResult {
          status: 'passed' | 'failed' | 'warning';
          levels: string[];
          rulesChecked: number;
          issues: ValidationIssue[];
          timestamp: string;
        }

        const archResult: ArchResult = await this.validator.validateArchitecture(satellitePath, corePath, archLevel);

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
    description: 'Incluir validación de arquitectura F1/F2/F3',
  })
  parseArchitecture(): boolean {
    return true;
  }

  @Option({
    flags: '-l, --arch-level [level]',
    description: 'Nivel de arquitectura: F1, F2, F3, ALL (default: ALL)',
  })
  parseArchLevel(val: string): string {
    return val;
  }

  @Option({
    flags: '-e, --engine [engine]',
    description: 'Motor de validación a utilizar: native (por defecto) u opa',
  })
  parseEngine(val: string): string {
    return val;
  }
}
