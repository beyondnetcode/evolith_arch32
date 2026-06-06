import { Command, CommandRunner, Option } from 'nest-commander';
import * as p from '@clack/prompts';
import chalk from 'chalk';
import { getContainer } from '../../core/di/container';
import { StandardsService, Standard, StandardCategory, ValidationResult } from '../../domain/services/standards.service';
import { logger } from '../../core/observability';

interface StandardsCommandOptions {
  init?: boolean;
  list?: boolean;
  get?: string;
  validate?: string;
  export?: string;
  format?: string;
  category?: string;
}

@Command({
  name: 'standards',
  description: 'Gestión de estándares Evolith (arquitectura, gobernanza, operaciones)',
})
export class StandardsCommand extends CommandRunner {
  async run(
    passedParam: string[],
    options?: StandardsCommandOptions,
  ): Promise<void> {
    const fs = getContainer().createFileSystem() as any;

    if (options?.init) {
      await this.initializeStandards(fs);
    } else if (options?.list) {
      await this.listStandards(fs, options.category);
    } else if (options?.get) {
      await this.getStandard(fs, options.get);
    } else if (options?.validate) {
      await this.validateStandards(fs, options.validate);
    } else if (options?.export) {
      await this.exportStandard(fs, options.export, options.format);
    } else {
      await this.interactiveMode(fs);
    }
  }

  private async interactiveMode(fs: any): Promise<void> {
    console.clear();
    p.intro(chalk.bgCyan.white.bold(' Evolith Standards - Corporate Standards Management '));

    const action = await p.select({
      message: '¿Qué acción deseas realizar?',
      options: [
        { value: 'init', label: 'Inicializar', hint: 'Crear estructura de standards' },
        { value: 'list', label: 'Listar Standards', hint: 'Ver todos los standards' },
        { value: 'get', label: 'Ver Standard', hint: 'Detalles de un standard' },
        { value: 'validate', label: 'Validar Código', hint: 'Validar contra standards' },
        { value: 'export', label: 'Exportar', hint: 'Exportar standard a MD/JSON' },
      ],
    });

    switch (action) {
      case 'init':
        await this.initializeStandards(fs);
        break;
      case 'list':
        await this.listStandards(fs);
        break;
      case 'get':
        const id = await p.text({ message: 'ID del Standard:' });
        await this.getStandard(fs, id as string);
        break;
      case 'validate':
        const code = await p.text({ message: 'Código a validar:' });
        await this.validateStandards(fs, code as string);
        break;
      case 'export':
        const exportId = await p.text({ message: 'ID del Standard:' });
        const format = await p.select({
          message: 'Formato:',
          options: [
            { value: 'markdown', label: 'Markdown' },
            { value: 'json', label: 'JSON' },
          ],
        });
        await this.exportStandard(fs, exportId as string, format as string);
        break;
    }
  }

  private async initializeStandards(fs: any): Promise<void> {
    logger.info('Initializing standards directory structure');

    const service = new StandardsService(fs, process.cwd());
    const spinner = p.spinner();
    spinner.start('Inicializando...');

    try {
      await service.initialize();
      spinner.stop();
      p.log.success(chalk.green('✓ Estructura de standards creada'));
      p.log.info('  Ubicación: reference/standards/');
      p.log.info('  Subcarpetas: rulesets/, templates/');
      p.log.info('\nPara ver los standards disponibles, usa: evolith standards --list');
    } catch (error) {
      spinner.stop();
      logger.error('Failed to initialize standards', { error });
      p.log.error(chalk.red('✗ Error inicializando standards'));
    }
  }

  private async listStandards(fs: any, category?: string): Promise<void> {
    logger.info('Listing standards', { category });

    const service = new StandardsService(fs, process.cwd());
    const cat = category as StandardCategory | undefined;
    const standards = await service.list(cat);

    if (standards.length === 0) {
      p.log.warn('No hay standards registrados.');
      p.log.info('Usa "evolith standards --init" para inicializar la estructura.');
      return;
    }

    console.log(`\nTotal Standards: ${standards.length}\n`);

    const table = standards.map(s => ({
      id: s.id,
      name: s.name,
      version: s.version,
      category: s.category,
      rules: s.rules.length,
    }));

    console.table(table);
  }

  private async getStandard(fs: any, id: string): Promise<void> {
    logger.info('Getting standard', { id });

    const service = new StandardsService(fs, process.cwd());
    const standard = await service.get(id);

    if (!standard) {
      p.log.error(chalk.red(`Standard ${id} no encontrado`));
      return;
    }

    console.log(chalk.bold(`\n${standard.name}`));
    console.log(`ID: ${standard.id} | Version: ${standard.version} | Category: ${standard.category}`);
    console.log(`\n${standard.description}\n`);

    if (standard.rules.length > 0) {
      console.log(chalk.bold('Rules:'));
      standard.rules.forEach(rule => {
        const icon = rule.severity === 'error' ? '🔴' : rule.severity === 'warning' ? '🟡' : '🔵';
        console.log(`  ${icon} [${rule.severity}] ${rule.id}: ${rule.name}`);
        console.log(`      ${rule.description}`);
        if (rule.remediation) {
          console.log(`      → ${rule.remediation}`);
        }
      });
    }
  }

  private async validateStandards(fs: any, code: string): Promise<void> {
    if (!code) {
      p.log.error('Código requerido para validación');
      return;
    }

    logger.info('Validating code against standards');

    const service = new StandardsService(fs, process.cwd());
    const result = await service.validate(code);

    console.log(chalk.bold('\nValidation Results'));
    console.log(`Total Rules: ${result.totalRules}`);
    console.log(chalk.green(`Passed: ${result.passed}`));
    console.log(chalk.red(`Failed: ${result.failed}`));

    if (result.failed > 0) {
      console.log(chalk.bold('\nFailed Rules:'));
      result.results
        .filter(r => !r.passed)
        .forEach(r => {
          const icon = r.severity === 'error' ? '🔴' : '🟡';
          console.log(`  ${icon} ${r.standardId}/${r.ruleId}: ${r.ruleName}`);
          console.log(`      ${r.message}`);
        });
    }
  }

  private async exportStandard(fs: any, id: string, format?: string): Promise<void> {
    logger.info('Exporting standard', { id, format });

    const service = new StandardsService(fs, process.cwd());
    const fmt = (format as 'json' | 'markdown') || 'markdown';

    try {
      const output = await service.export(id, fmt);
      console.log(`\n${output}\n`);
    } catch (error) {
      logger.error('Failed to export standard', { error });
      p.log.error(chalk.red(`Error exportando standard: ${error}`));
    }
  }

  @Option({
    flags: '--init',
    description: 'Inicializar estructura de standards',
  })
  parseInit(): boolean {
    return true;
  }

  @Option({
    flags: '-l, --list',
    description: 'Listar todos los standards',
  })
  parseList(): boolean {
    return true;
  }

  @Option({
    flags: '-g, --get [id]',
    description: 'Ver standard específico',
  })
  parseGet(val: string): string {
    return val;
  }

  @Option({
    flags: '-v, --validate [code]',
    description: 'Validar código contra standards',
  })
  parseValidate(val: string): string {
    return val;
  }

  @Option({
    flags: '-e, --export [id]',
    description: 'Exportar standard',
  })
  parseExport(val: string): string {
    return val;
  }

  @Option({
    flags: '-f, --format [format]',
    description: 'Formato de exportación: markdown, json',
  })
  parseFormat(val: string): string {
    return val;
  }

  @Option({
    flags: '-c, --category [category]',
    description: 'Filtrar por categoría',
  })
  parseCategory(val: string): string {
    return val;
  }
}