import { Command, CommandRunner, Option } from 'nest-commander';
import * as p from '@clack/prompts';
import * as chalk from 'chalk';
import { ValidateSatelliteUseCase } from '../../application/use-cases/validate-satellite.use-case';
import { ValidationResult, ValidationIssue, RulesetValidatorService } from '../../core/validators/ruleset-validator.service';
import { logger } from '../../core/observability';
import { OutputFormatterService, OutputFormat } from '../../infrastructure/formatters/output-formatter.service';

interface ValidateCommandOptions {
  format?: string;
  output?: string;
  satellite?: string;
  core?: string;
  ruleset?: string;
  architecture?: boolean;
  archLevel?: string;
}

@Command({
  name: 'validate',
  description: 'Verifica que el repositorio satélite cumpla los estándares mínimos de Evolith',
})
export class ValidateCommand extends CommandRunner {
  private useCase = new ValidateSatelliteUseCase();

  async run(passedParam: string[], options?: ValidateCommandOptions): Promise<void> {
    p.intro(' Evolith SDK - Validación de Estándares ');

    const satellitePath = options?.satellite || process.cwd();
    const corePath = options?.core || undefined;

    const s = p.spinner();
    s.start('Analizando repositorio...');

    let result: ValidationResult;

    try {
      if (options?.ruleset) {
        result = (await this.useCase.execute({
          satellitePath,
          corePath,
          rulesetId: options.ruleset,
        })).result;
      } else {
        result = (await this.useCase.execute({ satellitePath, corePath })).result;
      }

      if (options?.architecture) {
        const validator = new RulesetValidatorService();
        const archLevel = (options?.archLevel as 'F1' | 'F2' | 'F3' | 'ALL') || 'ALL';

        interface ArchResult {
          status: 'passed' | 'failed' | 'warning';
          levels: string[];
          rulesChecked: number;
          issues: ValidationIssue[];
          timestamp: string;
        }

        const archResult: ArchResult = await validator.validateArchitecture(satellitePath, corePath, archLevel);

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
      s.stop();
      logger.error('Validation failed', { error });
      p.log.error(chalk.red(`Error durante validación: ${error}`));
      process.exit(1);
    }

    s.stop();

    const format = (options?.format as OutputFormat) || 'markdown';
    const formatter = new OutputFormatterService();

    if (format === 'json') {
      const output = JSON.stringify(result, null, 2);
      if (options?.output) {
        const fs = await import('fs-extra');
        await fs.writeFile(options.output, output, 'utf-8');
        p.log.success(`Reporte guardado en ${options.output}`);
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
        p.log.success(`Reporte guardado en ${options.output}`);
      } else {
        console.log(output);
      }
    } else {
      this.printHumanReport(result);
    }

    if (result.status === 'failed') {
      p.outro(chalk.red('❌ La validación ha fallado. Revise los errores acima.'));
      process.exit(1);
    } else if (result.status === 'warning') {
      p.outro(chalk.yellow('⚠️ La validación ha terminado con advertencias.'));
    } else {
      p.outro(chalk.green('✅ El repositorio cumple con todos los estándares de Evolith.'));
    }
  }

  private printHumanReport(result: ValidationResult): void {
    if (result.issues.length === 0) {
      p.log.success('No se encontraron problemas.');
      return;
    }

    const blocking = result.issues.filter(i => i.blocking);
    const warnings = result.issues.filter(i => !i.blocking);

    if (blocking.length > 0) {
      p.log.error(chalk.red(`\n${blocking.length} error(es) bloqueante(s):`));
      for (const issue of blocking) {
        p.log.error(chalk.red(`  [${issue.ruleId}] ${issue.title}`));
        p.log.error(chalk.red(`    ${issue.description}`));
        if (issue.file) {
          p.log.error(chalk.red(`    Archivo: ${issue.file}`));
        }
      }
    }

    if (warnings.length > 0) {
      p.log.warn(chalk.yellow(`\n${warnings.length} advertencia(es):`));
      for (const issue of warnings) {
        p.log.warn(chalk.yellow(`  [${issue.ruleId}] ${issue.title}`));
        p.log.warn(chalk.yellow(`    ${issue.description}`));
      }
    }

    p.log.info(chalk.cyan(`\nReglas verificadas: ${result.rulesChecked}`));
    if (result.coreRef.version) {
      p.log.info(chalk.cyan(`Core version pinneada: ${result.coreRef.version}`));
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
    description: 'Validar ruleset específico (adr-0002, acl, open-core, inheritance)',
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
}