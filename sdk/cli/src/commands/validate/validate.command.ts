import { Command, CommandRunner, Option } from 'nest-commander';
import * as p from '@clack/prompts';
import * as chalk from 'chalk';
import * as path from 'path';
import { RulesetValidatorService, ValidationResult } from '../../core/validators/ruleset-validator.service';

interface ValidateCommandOptions {
  format?: string;
  output?: string;
  satellite?: string;
  core?: string;
  ruleset?: string;
}

@Command({
  name: 'validate',
  description: 'Verifica que el repositorio satélite cumpla los estándares mínimos de Evolith',
})
export class ValidateCommand extends CommandRunner {
  private validator = new RulesetValidatorService();

  async run(passedParam: string[], options?: ValidateCommandOptions): Promise<void> {
    p.intro(' Evolith SDK - Validación de Estándares ');

    const satellitePath = options?.satellite || process.cwd();
    const corePath = options?.core || undefined;

    const s = p.spinner();
    s.start('Analizando repositorio...');

    let result: ValidationResult;

    if (options?.ruleset) {
      const coreResolved = corePath || this.findCoreFromSatellite(satellitePath);
      const issues = await this.validator.loadRulesetById(coreResolved, options.ruleset);
      result = {
        status: issues.some(i => i.blocking) ? 'failed' : issues.length > 0 ? 'warning' : 'passed',
        rulesChecked: issues.length,
        issues,
        coreRef: { version: null, path: coreResolved },
        timestamp: new Date().toISOString(),
      };
    } else {
      result = await this.validator.validate(satellitePath, corePath);
    }

    s.stop();

    if (options?.format === 'json') {
      const output = JSON.stringify(result, null, 2);
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

  private findCoreFromSatellite(satellitePath: string): string {
    const parts = satellitePath.split(path.sep);
    while (parts.length > 0) {
      parts.pop();
      const candidate = path.join(parts.join(path.sep), 'rulesets');
      try {
        const fs = require('fs-extra');
        if (fs.pathExistsSync(candidate)) {
          return parts.join(path.sep);
        }
      } catch {
        continue;
      }
    }
    return satellitePath;
  }

  @Option({
    flags: '-f, --format [string]',
    description: 'Formato de salida (json)',
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
}